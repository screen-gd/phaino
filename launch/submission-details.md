**Phaino submission answers**

Prepared against the [current entry form](https://form.typeform.com/to/V1dSQrkS) and [official challenge page](https://comfy.org/open-source-higgsfield), checked October 30, 2026. Replace the bracketed entries with your own details and published links. These answers describe the existing partner-model demo.

**Your details**

- Credited name: [your preferred public name; Screen if you want to use your handle]
- Comfy account email: [your Comfy account email]
- Country: [your country]
- X handle: @Screeendev
- Discord and Reddit: [your handles, or leave blank]
- Previous ComfyUI experience: choose the option that accurately describes your experience before the challenge. This cannot be inferred from the project.

**Project title**

```text
Phaino
```

**Short description, 90 characters**

```text
Open-source AI image and video studio with ComfyUI workflows, editing, and MCP automation.
```

**Repository**

```text
https://github.com/screen-gd/phaino
```

Merge the submission fixes before entering so the default branch contains the corrected setup and workflow downloads.

**Demo link**

```text
[public URL of the uploaded 24-second Phaino demo]
```

The prepared video is `brag-output/brag.mp4`. Upload it publicly. If your social post plays the full demo without requiring access approval, that post can serve as the demo link too; the form does not require different URLs.

**Optional live generation link**

Leave blank. The app runs locally, and the hosted preview serves samples rather than real generation. Local execution is accepted by the challenge. Do not present the marketing site or sample preview as an executable generation endpoint.

**Social post link**

```text
[public URL of your video post containing #OpenSourceHiggsfield]
```

**Comfy integrations**

Select Comfy API, Comfy Router and Comfy SDK. The repository verifies these integrations. Leave Comfy Cloud Agent and Comfy MCP unchecked unless you separately used those official tools. Phaino's own MCP server is a custom integration.

**Models**

```text
Demo: Nano Banana 2, Kling 3.0 and Seedance 2.5. Additional bundled workflows support LTX 2.5, Wan 2.2, FLUX.2 Klein, Qwen Image and SCAIL-2.
```

The first three have recorded successful runs in the launch plan. The remaining names describe supported workflows, not additional verified runs in this demo. Add any other models actually used in the material you submit.

**Other tools and techniques**

```text
Phaino is a local Next.js, React and TypeScript app built on the Comfy SDK. It runs ComfyUI workflows through the Comfy API and partner models through Comfy Router using the user's Comfy key.

Preset controls map to workflow inputs, and users can inspect, download and fork the workflows locally. Results are saved to a local library. The built-in timeline supports trimming, sequencing, audio and titles, with ffmpeg rendering and FCPXML/EDL export for other editors.

A custom MCP server lets agents use the same generation presets as the UI, upload media, work with the library and timeline, and request exports. Optional social publishing uses Zernio. The app code is MIT licensed.
```

**Categories**

Recommended: Most Innovative and Most Viral. Best Overall is considered automatically. This is a suggested fit, not a claim that the project meets the judges' threshold for innovation or virality.

Skip Open Weights Only for this partner-model submission. Leave the FLUX 3, LTX and MiniMax H3 bonus categories unselected unless your submitted work demonstrates the corresponding model as the core of its workflow. Merely listing the model in a picker does not establish that requirement.

**Fully open stack**

Select No. The app code is open source, but this demo uses closed partner models through Router.

**Optional note to judges**

```text
Phaino's main idea is that the visual studio and an AI agent can operate the same generation presets. The demo shows Nano Banana 2 creating a still, Kling 3.0 turning it into a shot, the workflow behind the preset, and an agent using Phaino's custom MCP tools for image and video generation with Seedance 2.5.

The app runs locally with your own Comfy key. The repository includes the workflow JSON and setup instructions. Public generation hosting and a community publishing service are not part of this submission.
```

If entering Most Innovative, explain this shared UI-and-agent workflow in the demo itself as well. Do not rely only on this written note.

**Agreements**

Confirm these yourself: the repo is public and licensed; the submitted material is lawful, SFW and rights-cleared; this is your only entry; and you agree to the stated feature terms. The repository's MIT license is verified. Consent, rights and your entry history cannot be confirmed on your behalf.

**Suggested social caption**

Attach the prepared demo video and paste:

```text
Built Phaino for #OpenSourceHiggsfield.

An open-source AI image and video studio on ComfyUI. Generate a still, turn it into a shot, inspect the workflow, or run the same presets through MCP.

https://github.com/screen-gd/phaino
```

**Before submitting**

Confirm challenge signup, merge the fixes, publish the video post, replace both URL placeholders and complete the form. The official deadline is October 30 at 9am Pacific, which is 8pm Dubai. No form answers or social posts have been sent.
