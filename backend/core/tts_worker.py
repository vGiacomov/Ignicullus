
import base64
import io
import os
import queue
import threading
import uuid
import wave
from dataclasses import dataclass
from typing import Dict, Optional


SUPERTONIC_VOICE = os.environ.get("TTS_VOICE", "F4")
SUPERTONIC_LANG = os.environ.get("TTS_LANG", "en")


@dataclass
class Job:
    id: str
    text: str
    status: str = "queued"
    audio_b64: Optional[str] = None
    error: Optional[str] = None


class TTSWorkerService:
    def __init__(self):
        self.jobs: Dict[str, Job] = {}
        self.q: queue.Queue[str] = queue.Queue()
        self.lock = threading.Lock()
        self.ready = False
        self.sample_rate = 24000
        self.tts = None
        self.voice_style = None
        self._boot_error = None
        self._load_model()
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()

    def _load_model(self):
        try:
            from supertonic import TTS
            self.tts = TTS(auto_download=True)
            self.voice_style = self.tts.get_voice_style(voice_name=SUPERTONIC_VOICE)
            self.ready = True
        except Exception as e:
            self._boot_error = str(e)
            self.ready = False

    def enqueue(self, text: str) -> Job:
        job = Job(id=str(uuid.uuid4()), text=text.strip())
        with self.lock:
            self.jobs[job.id] = job
        self.q.put(job.id)
        return job

    def get(self, job_id: str) -> Optional[Job]:
        with self.lock:
            return self.jobs.get(job_id)

    def status(self):
        return {
            'ready': self.ready,
            'engine': 'supertonic-worker' if self.ready else 'browser',
            'sample_rate': self.sample_rate,
            'voice': SUPERTONIC_VOICE,
            'lang': SUPERTONIC_LANG,
            'boot_error': self._boot_error,
            'queued_jobs': self.q.qsize(),
        }

    def _synthesize(self, text: str) -> str:
        import numpy as np
        wav_arr, _ = self.tts.synthesize(text, voice_style=self.voice_style, lang=SUPERTONIC_LANG)
        pcm = (wav_arr * 32767).astype(np.int16)
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(pcm.tobytes())
        return base64.b64encode(buf.getvalue()).decode('utf-8')

    def _run(self):
        while True:
            job_id = self.q.get()
            job = self.get(job_id)
            if not job:
                continue
            if not self.ready:
                job.status = 'error'
                job.error = self._boot_error or 'TTS engine not ready'
                continue
            try:
                job.status = 'processing'
                job.audio_b64 = self._synthesize(job.text)
                job.status = 'done'
            except Exception as e:
                job.status = 'error'
                job.error = str(e)


service = TTSWorkerService()
