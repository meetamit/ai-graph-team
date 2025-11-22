# Stable Diffusion WebUI

This package provides a wrapper for the [Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui), and specifically the REST API that it exposes.

## Installation

Installation instructions can be found on the Stable Diffusion WebUI [README page](https://github.com/AUTOMATIC1111/stable-diffusion-webui#installation-and-running), and mac-specific instructions can be found on the [this wiki page](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Installation-on-Apple-Silicon), and here too:

1. Install dependencies (assuming you have homebrew installed):

    ```bash
    # Install dependencies with homebrew:
    brew install cmake protobuf rust python@3.10 git wget

    # From the root of the project, cd into the stable-diffusion-webui package:
    cd ./packages/stable-diffusion-webui

    # Clone the repository:
    git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui app
    ```

2. Download a model and place it in the `./packages/stable-diffusion-webui/app/models/Stable-diffusion` directory. See [model downloading instructions](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/How-to-download-models), or just go for v2 by downloading `v2-1_512-ema-pruned.ckpt` from [Hugging Face](https://huggingface.co/Manojb/stable-diffusion-2-1-base/tree/main).

3. Start the WebUI:

    ```bash
    # From ./packages/stable-diffusion-webui, cd into the app directory:
    cd app

    # Or, from the root of the project, cd into the stable-diffusion-webui package:
    # cd ./packages/stable-diffusion-webui/app

    # Start the WebUI:
    ./webui.sh --api # Optional: include `--nowebui` to disables the web interface
    ```

4. (Optional) If you've launched the WebUI (skipped `--nowebui` in step 3), you can view it at [http://localhost:7860](http://localhost:7860)
