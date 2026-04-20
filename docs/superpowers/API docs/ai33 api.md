List Models
Retrieves available image generation models with supported parameters.
Request

curl "https://api.ai33.pro/v1i/models" \
  -H "xi-api-key: $API_KEY"
Success Response Example
{
  "success": true,
  "models": [
    {
      "model_id": "bytedance-seedream-4.5",
      "max_generations": 4,
      "aspect_ratios": ["16:9", "4:3", "1:1", "3:4", "9:16"],
      "resolutions": ["2K", "4K"],
      "supports_images": true,
      "requires_reference_images": false,
      "supports_enhance_prompt": false,
      "supports_negative_prompt": false,
      "max_assets": 10
    }
  ]
}
Get Price
Calculate credits cost before generating an image.
Request

curl -X POST "https://api.ai33.pro/v1i/task/price" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: $API_KEY" \
  -d '{
  "model_id": "bytedance-seedream-4.5",
  "generations_count": 1,
  "model_parameters": {
    "aspect_ratio": "16:9",
    "resolution": "2K"
  },
  "assets": 2
}'
model_id: string Required. Model ID from /v1i/models
generations_count: number Number of images to generate (1-4, depends on model). Default: 1
model_parameters: object Model-specific parameters (aspect_ratio, resolution, etc. — see /v1i/models)
assets: number Number of reference images attached (for price calculation). Default: 0
Success Response Example
{
  "success": true,
  "credits": 1188
}
Generate Image
Generate images from text prompts with optional reference images.
Request

curl -X POST "https://api.ai33.pro/v1i/task/generate-image" \
  -H "xi-api-key: $API_KEY" \
  -F 'prompt=A beautiful sunset over the ocean in watercolor style' \
  -F 'model_id=bytedance-seedream-4.5' \
  -F 'generations_count=1' \
  -F 'model_parameters={"aspect_ratio":"16:9","resolution":"2K"}' \
  -F 'receive_url=http://your-webhook-endpoint'
prompt: string Required. Image description (max 4000 characters). Supports @img1, @img2... to reference assets
model_id: string Required. Model ID from /v1i/models
generations_count: string Number of images to generate. Default: "1"
model_parameters: string (JSON) Model parameters as JSON string
assets: File (binary) Reference images. Send multiple assets fields for multiple files. Max 5MB/file
receive_url: string Optional: Webhook URL. Server will POST results when task completes or fails
Image References (@img)
Use @img1, @img2,... in your prompt to reference uploaded assets:
• @img1 → 1st asset file
• @img2 → 2nd asset file
Number of @img references must match number of assets files.
Example with Assets

curl -X POST "https://api.ai33.pro/v1i/task/generate-image" \
  -H "xi-api-key: $API_KEY" \
  -F 'prompt=Merge @img2 into @img1 keeping the original dress' \
  -F 'model_id=bytedance-seedream-4.5' \
  -F 'model_parameters={"aspect_ratio":"1:1","resolution":"2K"}' \
  -F 'assets=@image1.png' \
  -F 'assets=@image2.png'
Success Response Example
{
  "success": true,
  "task_id": "abc123",
  "estimated_credits": 1188,
  "ec_remain_credits": "8812"
}
Request we POST to your webhook endpoint; or you can polling the Common / GET Task
{
  "id": "abc123",
  "type": "imagen2",
  "status": "done",
  "progress": 100,
  "credit_cost": 1188,
  "created_at": "2026-02-22T06:00:00.000Z",
  "metadata": {
    "prompt": "A beautiful sunset over the ocean",
    "modelId": "bytedance-seedream-4.5",
    "generationsCount": 1,
    "modelParameters": {
      "aspect_ratio": "16:9",
      "resolution": "2K"
    },
    "result_images": [
      {
        "id": "img_001",
        "imageUrl": "https://...",
        "previewUrl": "https://...",
        "mimeType": "image/png",
        "width": 1920,
        "height": 1080
      }
    ]
  }
}
Get Task Status
Poll task status for image generation progress. Uses the common task endpoint.
Request

curl "https://api.ai33.pro/v1/task/$task_id" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: $API_KEY"
Response (processing)
{
  "id": "abc123",
  "type": "imagen2",
  "status": "doing",
  "progress": 30,
  "credit_cost": 1188,
  "created_at": "2026-02-22T06:00:00.000Z"
}
Response (completed)
{
  "id": "abc123",
  "type": "imagen2",
  "status": "done",
  "progress": 100,
  "credit_cost": 1188,
  "metadata": {
    "result_images": [
      {
        "id": "img_001",
        "imageUrl": "https://...",
        "previewUrl": "https://...",
        "mimeType": "image/png",
        "width": 1920,
        "height": 1080
      }
    ]
  }
}
Response (error)
{
  "id": "abc123",
  "type": "imagen2",
  "status": "error",
  "error_message": "Image generation failed: ...",
  "credit_cost": 1188
}
Credits will be automatically refunded if task fails.
List Tasks
List image generation tasks with pagination.
Request

curl "https://api.ai33.pro/v1/tasks?type=imagen2&page=1&limit=20" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: $API_KEY"
Query params:
- type: Use imagen2 for image generation tasks
- page: number (default: 1)
- limit: number (1-100, default: 20)
Success Response Example
{
  "success": true,
  "data": [ /* array of task objects */ ],
  "page": 1,
  "limit": 20,
  "total": 42
}
Delete Tasks
Delete image generation tasks by task IDs.
Request

curl -X POST "https://api.ai33.pro/v1/task/delete" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: $API_KEY" \
  --data-raw '{"task_ids":["abc123","def456"]}'
Integration Flow
Recommended integration patterns for image generation.
Method 1: Polling
1. GET  /v1i/models                    → Get available models
2. POST /v1i/task/price                → Calculate price
3. POST /v1i/task/generate-image       → Generate image → receive task_id
4. GET  /v1/task/:task_id              → Poll status (every 3-5s)
   - status = "doing"  → continue polling
   - status = "done"   → get images from metadata.result_images
   - status = "error"  → show error (credits refunded)
Method 2: Webhook (recommended)
1. GET  /v1i/models                    → Get available models
2. POST /v1i/task/price                → Calculate price
3. POST /v1i/task/generate-image       → Send with receive_url → receive task_id
4. Server POSTs result to receive_url  → Process result
Error Responses
Common error status codes for image generation API.
{
  "success": false,
  "message": "..."
}
• 400 — Validation error (model, params, @img mismatch)
• 401 — Invalid API key or insufficient credits
• 422 — Model parameter error
• 429 — Rate limit or queue full