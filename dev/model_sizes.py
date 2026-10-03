"""Report the real download size of each (model, dtype, device) combination, by asking
the mirror server for the files and adding up the bytes.

usage: python dev/model_sizes.py
"""
import json
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
HF = 'https://huggingface.co'
MODELS = ['onnx-community/whisper-tiny_timestamped', 'onnx-community/whisper-base_timestamped',
          'onnx-community/whisper-small_timestamped']
DTYPES = {'q8': 'q8', 'fp16': 'fp16'}


def files(repo):
    url = f'{HF}/api/models/{repo}?blobs=true'
    with urllib.request.urlopen(url, timeout=60) as r:
        d = json.load(r)
    return {s['rfilename']: (s.get('size') or 0) for s in d.get('siblings', [])}


for repo in MODELS:
    f = files(repo)
    print(repo.split('/')[-1])
    for dtype in ('q8', 'fp16'):
        enc = next((v for k, v in f.items() if k.endswith(f'encoder_model_{dtype}.onnx')), 0)
        dec = next((v for k, v in f.items() if k.endswith(f'decoder_model_merged_{dtype}.onnx')), 0)
        extra = sum(v for k, v in f.items() if k.endswith('.onnx_data') and dtype in k)
        print(f'   {dtype:5s} encoder {enc/1e6:7.1f} MB  decoder {dec/1e6:7.1f} MB  extra {extra/1e6:7.1f} MB'
              f'  total {(enc + dec + extra)/1e6:7.1f} MB')
