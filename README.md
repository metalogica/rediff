# rediff
Make Retool™ diffs easier to read.

![](https://res.cloudinary.com/dtmuylvrr/image/upload/v1684867955/rediff-demo-gif.gif)

## Features
* Load a diff of any open branch against master with syntax highlighting.
* Automatically filter out irrelevant changes such as module positioning data.
* Quickly find relevant changes by filtering according to module type and filename.
* Switch between a compressed view to isolate changes, or a unified view to see changes in the context of the entire file.

## Setup
* Install the extension.
* Provide your Retool™ directory path:
  * Navigate to your VS Code settings (`CMD + ,` on Mac OS X).
  * Search for `rediff` in the settings search bar.
  * Enter the path to your Retool™ directory.

![](https://res.cloudinary.com/dtmuylvrr/image/upload/c_scale,w_720/v1684867962/rediff-settings.png)

* Load a diff:
  * Open the command palettte (`CMD + SHIFT + P` on Mac OS X).
  * Search for the command `Rediff: Load Git Branch`
  * Paste your branch name and hit enter.

## Extension Settings
This extension contributes the following settings:

* `rediff.loadFile`: Load a branch and diff it against master.
* `rediff.retoolDir`: The absolute path to your Retool™ directory.

## Release Notes
Pre-release.

---
