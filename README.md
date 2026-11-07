# Ravi M — Portfolio

Source repository for Ravi M's portfolio and Cloudflare Workers preview.

- Preview Worker: `rm-portfolio-preview`
- Editable website: `public/` (HTML, CSS, JavaScript, portraits and fonts)
- Automatic 12-cursor tour, cursor-first reveals, project dialogs, filters and comparison slider are preserved.
- Imported unchanged from ChatGPT Sites source commit `553c716f95e6cd1e2ad700c490fc8cf5e65b8a83`.

## Development

Use Node 22 or newer. No npm dependencies are required.

```sh
python3 -m http.server 8080 --directory public
npm run check
npm run build
```

## Deployment

The connected Cloudflare integration can deploy `.build/worker-upload.json` with the Workers multipart upload API. The generated bundle includes all assets; the running preview does not fetch its files from GitHub or ChatGPT.

Alternatively, set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` securely in your deployment environment and run `npm run deploy`. Never commit credentials. `SOURCE_REVISION` can identify the source revision; otherwise Git HEAD is used.

GitHub Actions checks code and packages the Worker on pushes and pull requests. Push-to-deploy is not enabled automatically; deployments are performed through the connected Cloudflare integration or the deploy script.

The contact brief downloads locally and does not send email. Some linked project previews may require their own access.
