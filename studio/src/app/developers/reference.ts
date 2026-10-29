type Endpoint = [method: string, path: string, request: string, response: string];

export const reference: { title: string; endpoints: Endpoint[] }[] = [
  { title: "Presets", endpoints: [
    ["GET", "/api/presets", "None", "200 {presets: [{id, name, description, category, order, chip?, model: {id, label, license}}]}"],
    ["GET", "/api/presets/:id", "Preset id", "200 {preset, workflowApi, workflowUi}; 404 if unknown"],
    ["GET", "/api/presets/:id/workflow?format=ui|api", "format defaults to ui", "200 workflow JSON download; 404 if unavailable"],
    ["GET", "/api/presets/:id/thumb", "Preset id", "200 WebP thumbnail; 404 if unavailable"],
  ] },
  { title: "Uploads", endpoints: [
    ["POST", "/api/uploads", "multipart/form-data: file. PNG/JPEG/WebP up to 25 MB; MP4/MOV/WebM up to 500 MB", "201 {uploadId, previewUrl}"],
    ["POST", "/api/uploads/from-output", '{path: "orbit/output.mp4"}', "201 {uploadId, previewUrl}; copies an output into uploads"],
    ["GET", "/api/uploads/:id", "uploadId including extension", "200 media bytes"],
  ] },
  { title: "Jobs", endpoints: [
    ["POST", "/api/jobs", "{presetId, params?: Record<string, string | number | boolean>, inputs?: Record<inputKey, uploadId>}", "201 {job}; 400 invalid input; 409 not_connected"],
    ["GET", "/api/jobs?category=&limit=", "Optional category and numeric limit", "200 {jobs: Job[]}, newest first"],
    ["GET", "/api/jobs/:id", "Job id", "200 {job}; 404 if unknown"],
    ["GET", "/api/jobs/:id/events", "Job id; Accept: text/event-stream", "200 SSE: data: <Job JSON>, current record then updates; 404 if unknown"],
    ["POST", "/api/jobs/:id/cancel", "No body", "200 {job}; 404 if unknown"],
  ] },
  { title: "Outputs", endpoints: [
    ["GET", "/api/outputs/:path", "Path from job.outputs; optional Range: bytes=start-end", "200 media bytes; 206 partial content; 416 unsatisfiable range"],
  ] },
  { title: "Forks", endpoints: [
    ["POST", "/api/forks", "{presetId}", "201 {preset}"],
    ["PATCH", "/api/forks/:id", "{name?: string (1..120), description?: string (max 500), defaults?: Record<string, string | number | boolean>}", "200 {preset}"],
    ["DELETE", "/api/forks/:id", "No body", "204, no body"],
    ["PUT", "/api/forks/:id/workflow", "multipart/form-data: workflow (UI JSON file), workflow_api (API JSON file), each up to 5 MB", "200 {preset}; validation errors include {error, problems?}"],
  ] },
  { title: "Sequence", endpoints: [
    ["GET", "/api/sequence", "None", "200 {sequence, layout}"],
    ["PUT", "/api/sequence", "Partial {fps: 24|25|30, resolution: 1080p|4K, aspect: 16:9|9:16|1:1|4:5, fit: contain|cover, handles: 0|12|24, clips: Clip[], audio: AudioClip[], titles: Title[]}", "200 {sequence, layout}; supplied arrays replace their lane"],
    ["POST", "/api/sequence/clips", "{path}: generated output path", "201 {sequence, layout}; appends a clip"],
    ["DELETE", "/api/sequence/clips/:id", "Clip id", "200 {sequence, layout}"],
    ["POST", "/api/sequence/media", "{path}: existing output or uploads/editor/... path", "201 {media, sequence, layout}"],
    ["POST", "/api/sequence/media/upload", "multipart/form-data: file (up to 500 MB)", "201 {media, sequence, layout}"],
    ["GET", "/api/sequence/media/:id", "Media id; optional Range header", "200 media bytes; 206 partial content; 416 unsatisfiable range"],
    ["DELETE", "/api/sequence/media/:id", "Media id", "200 {sequence, layout}; removes referencing clips too"],
    ["GET", "/api/sequence/posters/:id", "Media UUID", "200 JPEG poster"],
    ["GET", "/api/sequence/outputs", "None", "200 {items: [{relPath, name, kind, mtime}]}; up to 60 recent outputs"],
    ["POST", "/api/sequence/export", '{action?: "render"|"package", codec?: "h264"|"prores"}; defaults: render, h264', "201 {job}; track via /api/jobs/:id"],
    ["GET", "/api/exports/:id/:file", "Export job id and a path in job.outputs", "200 file download"],
    ["GET", "/api/exports/:id/zip", "Export job id", "200 application/zip"],
  ] },
  { title: "Edits", endpoints: [
    ["POST", "/api/edits/extend", "{uploadId, modelId, prompt?}", "201 {job}; continues the video from its last frame"],
    ["POST", "/api/edits/join", "{uploadId, result}: source upload and the extend output path", "200 {ok}; appends both to the Editor"],
  ] },
  { title: "Kawarimi (character swap)", endpoints: [
    ["POST", "/api/uploads", "Upload the source video, then the character image; keep both uploadIds", "201 {uploadId, previewUrl} each"],
    ["POST", "/api/jobs", '{presetId: "kawarimi" | "kawarimi-genjutsu" | "kawarimi-seedance" | "kawarimi-h3" | "kawarimi-wan27" | "kawarimi-happyhorse" | "kawarimi-aleph", inputs: {video: videoUploadId, character: imageUploadId}, params?: {prompt?, seed?, resolution?}}', "201 {job}; sources are trimmed to each engine's cap and the result keeps the source audio"],
  ] },
  { title: "Social", endpoints: [
    ["GET", "/api/social/credentials", "None", "200 {configured, maskedKey}"],
    ["PUT", "/api/social/credentials", "{apiKey}: Zernio API key", "200 {configured, maskedKey}; 400 if Zernio rejects the key"],
    ["DELETE", "/api/social/credentials", "No body", "200 {configured: false, maskedKey: null}"],
    ["GET", "/api/social/accounts", "None", "200 {configured, accounts: [{id, platform, name, handle?, status}]}; 502 on Zernio errors"],
    ["POST", "/api/social/posts", "{path: output path, text?, accountIds: string[]}", "200 {results: [{accountId, platform, state, url?, message?}]}; 409 without a key"],
  ] },
  { title: "Health", endpoints: [
    ["GET", "/api/health", "None", "200 {status, target: cloud|custom, host, latencyMs: number|null, message?: string}"],
  ] },
];
