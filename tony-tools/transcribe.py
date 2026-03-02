#!/usr/bin/env python3
"""
Audio transcription using faster-whisper with GPU acceleration.
"""
import sys
import json
from pathlib import Path
from faster_whisper import WhisperModel

def transcribe_audio(audio_path: str, model_size: str = "large-v3") -> dict:
    """
    Transcribe audio file using faster-whisper.
    
    Args:
        audio_path: Path to audio file
        model_size: Model size (tiny, base, small, medium, large-v2, large-v3)
    
    Returns:
        dict with transcript text and metadata
    """
    try:
        # Initialize model with GPU acceleration
        model = WhisperModel(
            model_size,
            device="cuda",
            compute_type="float16"
        )
        
        # Transcribe
        segments, info = model.transcribe(
            audio_path,
            beam_size=5,
            language="en"
        )
        
        # Collect segments
        transcript_parts = []
        for segment in segments:
            transcript_parts.append(segment.text.strip())
        
        transcript = " ".join(transcript_parts)
        
        return {
            "success": True,
            "transcript": transcript,
            "language": info.language,
            "duration": info.duration,
            "segments": len(transcript_parts)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No audio file path provided"}))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "large-v3"
    
    result = transcribe_audio(audio_path, model_size)
    print(json.dumps(result))