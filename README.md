# Memory Prisms - Simple 3D Tools

This repo contains lightweight browser-based reference-image analysis tools.

## Features

- Command palette style tool switching.
- Protractor tool with 4-angle annotation at line intersections.
- Line Ratio tool for comparing two line lengths.
- Shared line lengths in both tools.
- Optional scale calibration to convert pixel lengths into real units.
- Paste an image with `Ctrl+V` to set it as canvas background.
- Optional file picker (`Load Image`) for local image files.
- Drag endpoints to refine measurements.
- Clear active lines, scale, and background independently.

## Run

Because this is plain HTML/CSS/JS, you can run it with any static server.

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Use Node's simple static server via npx

```bash
npx serve .
```

Then open the local URL shown in terminal.

## Usage

1. Paste image (`Ctrl+V`) or click `Load Image`.
2. Pick a tool from the palette:
	- `Protractor`: draw 2 lines, view all 4 intersection angles and both lengths.
	- `Line Ratio`: draw 2 lines, view ratio and both lengths.
3. Click 2 points for line 1, then 2 points for line 2.
4. Drag endpoints to fine-tune.
5. Optional scale workflow:
	- Click `Set Scale`.
	- Click 2 points for a reference segment.
	- Enter known length and unit.
	- Click `Apply Scale`.
6. Use `Clear Lines`, `Clear Scale`, or `Clear Image` as needed.
