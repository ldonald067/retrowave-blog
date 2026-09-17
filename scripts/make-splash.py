"""Build the iOS launch image: the app icon on the classic-xanga gradient.

Run from the repo root: python3 scripts/make-splash.py, then npx cap sync ios.
Needs Pillow. It overwrites all three files in Splash.imageset (they are the
same image at 1x/2x/3x, which is how Capacitor generated them).

The launch screen is a single static image scaled with scaleAspectFill on a
square canvas, so on a tall phone only a centre column survives the crop — the
narrowest is the 440x956 Pro Max at 440/956 = 0.46 of the width, about 1257px of
2732. Everything that must be seen stays inside a 1150px column.
"""

import math
from PIL import Image, ImageDraw, ImageFilter

SIZE = 2732
SAFE = 1150  # width that survives the crop on every current iPhone

# classic-xanga --bg-gradient-from / --via / --to, the theme the app always
# starts in (a signed-out user has no theme, so syncAuthState applies it).
FROM_RGB = (255, 228, 236)
VIA_RGB = (243, 232, 255)
TO_RGB = (232, 244, 255)
BORDER = (255, 153, 204)  # --border-primary
ACCENT = (214, 21, 126)  # --accent-primary


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def gradient():
    """Diagonal from-top-left to bottom-right, matching .themed-bg."""
    img = Image.new('RGB', (SIZE, SIZE))
    draw = ImageDraw.Draw(img)
    for i in range(SIZE * 2):
        t = i / (SIZE * 2 - 1)
        colour = lerp(FROM_RGB, VIA_RGB, t / 0.5) if t < 0.5 else lerp(VIA_RGB, TO_RGB, (t - 0.5) / 0.5)
        draw.line([(i, 0), (0, i)], fill=colour, width=2)
    return img


def sparkle(draw, cx, cy, r, colour):
    """A four-point star — the ✦ shape the app uses, not an emoji."""
    waist = r * 0.18
    draw.polygon(
        [(cx, cy - r), (cx + waist, cy - waist), (cx + r, cy),
         (cx + waist, cy + waist), (cx, cy + r), (cx - waist, cy + waist),
         (cx - r, cy), (cx - waist, cy - waist)],
        fill=colour,
    )


def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def main():
    img = gradient()
    draw = ImageDraw.Draw(img, 'RGBA')

    centre = SIZE // 2
    half = SAFE // 2

    # The dotted frame reads as .xanga-box, the app's one universal container.
    box = [centre - half, centre - int(half * 1.15), centre + half, centre + int(half * 1.15)]
    step, dot = 46, 9
    for x in range(box[0], box[2], step):
        for y in (box[1], box[3]):
            draw.ellipse([x - dot, y - dot, x + dot, y + dot], fill=BORDER)
    for y in range(box[1], box[3] + 1, step):
        for x in (box[0], box[2]):
            draw.ellipse([x - dot, y - dot, x + dot, y + dot], fill=BORDER)

    # Sparkles inside the frame only, so the crop cannot slice one in half.
    for angle, dist, r, colour in [
        (200, 0.86, 54, (*ACCENT, 210)),
        (255, 0.72, 34, (255, 255, 255, 235)),
        (320, 0.88, 44, (*BORDER, 235)),
        (25, 0.78, 30, (255, 255, 255, 230)),
        (110, 0.9, 50, (*ACCENT, 190)),
        (145, 0.68, 32, (*BORDER, 230)),
    ]:
        rad = math.radians(angle)
        sparkle(draw, centre + math.cos(rad) * half * dist, centre + math.sin(rad) * half * dist * 1.1, r, colour)

    # The icon, big enough to be the subject rather than a speck.
    icon = Image.open('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png').convert('RGBA')
    side = 760
    icon = icon.resize((side, side), Image.LANCZOS)
    icon.putalpha(rounded_mask(side, 150))

    shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    shadow.paste((*ACCENT, 70), (centre - side // 2, centre - side // 2 + 26), icon.split()[3])
    img.paste(Image.alpha_composite(img.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(34))).convert('RGB'))

    img.paste(icon, (centre - side // 2, centre - side // 2), icon)

    out = 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png'
    img.save(out)
    for copy in ('-1', '-2'):
        img.save(out.replace('.png', f'{copy}.png'))
    print('wrote', out, 'and two copies')


main()
