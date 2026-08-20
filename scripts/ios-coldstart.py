#!/usr/bin/env python3
"""Cold-start probe. Terminate, relaunch, sample a strip of pixels each frame
until the splash (near-black purple) gives way to the app (bright header).

File size cannot discriminate here: overriding the status bar adds enough
detail that a splash frame and a content frame land in the same size band.
Luminance of a fixed strip separates them cleanly."""
import subprocess, sys, time, statistics
from PIL import Image

UDID, BUNDLE = sys.argv[1], sys.argv[2]
RUNS = int(sys.argv[3]) if len(sys.argv) > 3 else 3
OUT = sys.argv[4]
STRIP_Y = 400          # native px; app header is here, splash is flat background
LUMA_GATE = 90         # splash measures ~20, loaded header ~200
MAX_WAIT = 40.0

def shot(path):
    r = subprocess.run(['xcrun', 'simctl', 'io', UDID, 'screenshot', path],
                       capture_output=True, text=True)
    return r.returncode == 0

def luma(path):
    with Image.open(path) as im:
        im = im.convert('RGB')
        w = im.width
        px = [im.getpixel((x, STRIP_Y)) for x in range(0, w, w // 40)]
    return statistics.mean(0.2126*r + 0.7152*g + 0.0722*b for r, g, b in px)

results = []
for run in range(1, RUNS + 1):
    subprocess.run(['xcrun', 'simctl', 'terminate', UDID, BUNDLE], capture_output=True)
    time.sleep(2.0)
    t0 = time.time()
    subprocess.run(['xcrun', 'simctl', 'launch', UDID, BUNDLE], capture_output=True)
    saw_splash, hit = False, None
    while time.time() - t0 < MAX_WAIT:
        p = f'{OUT}/cs_{run}_{int((time.time()-t0)*1000)}.png'
        if not shot(p):
            print(f'  run {run}: screenshot failed', flush=True); break
        el, L = time.time() - t0, luma(p)
        if L < LUMA_GATE:
            saw_splash = True
        elif saw_splash:
            hit = el
            print(f'  run {run}: content at {el:5.2f}s (luma {L:.0f})', flush=True)
            break
    if hit is None:
        print(f'  run {run}: no transition seen (saw_splash={saw_splash})', flush=True)
    else:
        results.append(hit)

if results:
    print(f'\n  n={len(results)}  median {statistics.median(results):.2f}s  '
          f'min {min(results):.2f}s  max {max(results):.2f}s', flush=True)
    print('  NOTE: upper bound — granularity is one screenshot round-trip (~1.5s).', flush=True)
