# Dash DRM Livestream decrypt API

## DISCLAIMER

THERE IS NO WARRANTY FOR THE SCRIPT, IT MIGHT NOT WORK AT ALL AND IT CAN BREAK AND STOP WORKING AT ANY TIME.

DULY NOTE THIS IS NOT AN ALL-IN-ONE SOLUTION AND IT REQUIRES YOU TO PROVIDE THE KEYS IN ORDER TO DECRYPT, YOUR DATA MAY VARY AND SO MODIFICATIONS TO THE SCRIPT ARE IN ORDER

---

## Usage

First of all make sure ffmpeg is on your PATH

By default is listening to port 3000, you can change this behaviour by setting the env var PORT to whatever port you wish

Start:

```
npm start
```

### API Routes:
```
/?url=[your MPD url]&key_v=[media key(hex) for video]&key_a=[media key(hex) for audio]
```

### IMPORTANT NOTE:
At the moment it can only process one stream at a time, more than one will hog up the pipeline

---

&copy; Project under MIT license