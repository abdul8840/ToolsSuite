# API Reference

## Base URL

Development: `http://localhost:5000`
Production behind web proxy: same-origin `/api`

## List tools

`GET /api/tools`

## Tool detail

`GET /api/tools/:slug`

## Run tool

`POST /api/tools/:slug`

Content type: `multipart/form-data`

Fields:

- `files`: one or more uploaded files, depending on the tool
- `options`: JSON string with tool options

Example:

```bash
curl -F "files=@input.png" -F 'options={"format":"webp","quality":75}' \
  http://localhost:5000/api/tools/compress-image -OJ
```

## Error response

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Password must be at least 6 characters."
}
```
