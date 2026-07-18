# Provider logos

Local, bundled cloud-provider logos rendered by `src/components/ProviderLogo.vue`.
They are loaded as static `<img src>` assets — **never fetched from a CDN at
runtime** — so the extension makes no third-party requests to display them.

Each file is named after its lowercase provider registry code (see
`src/services/providers/registry.ts`): `aws.svg`, `azure.svg`, `gcp.svg`,
`alibaba.svg`, `tencent.svg`, `cloudflare.svg`, `digitalocean.svg`, `linode.svg`,
`huawei.svg`. Providers without a bundled asset (currently **Volcano Engine**)
fall back to a brand-initial avatar; add a square SVG here and register its slug
in `getProviderLogoUrl` to enable a real logo.

## Provenance

| File | Source | Retrieved | Notes |
| --- | --- | --- | --- |
| `aws.svg` | https://www.vectorlogo.zone/logos/amazon_aws/amazon_aws-icon.svg | 2026-07-18 | Amazon Web Services icon |
| `azure.svg` | https://www.vectorlogo.zone/logos/microsoft_azure/microsoft_azure-icon.svg | 2026-07-18 | Microsoft Azure icon |
| `gcp.svg` | https://www.vectorlogo.zone/logos/google_cloud/google_cloud-icon.svg | 2026-07-18 | Google Cloud icon |
| `alibaba.svg` | https://www.vectorlogo.zone/logos/alibabacloud/alibabacloud-icon.svg | 2026-07-18 | Alibaba Cloud icon |
| `tencent.svg` | https://www.vectorlogo.zone/logos/tencent/tencent-icon.svg | 2026-07-18 | Tencent icon |
| `huawei.svg` | https://www.vectorlogo.zone/logos/huawei/huawei-icon.svg | 2026-07-18 | Huawei corporate mark |
| `cloudflare.svg` | https://www.vectorlogo.zone/logos/cloudflare/cloudflare-icon.svg | 2026-07-18 | Cloudflare icon |
| `digitalocean.svg` | https://www.vectorlogo.zone/logos/digitalocean/digitalocean-icon.svg | 2026-07-18 | DigitalOcean icon |
| `linode.svg` | https://www.vectorlogo.zone/logos/linode/linode-icon.svg | 2026-07-18 | Linode (Akamai) icon |

## Trademark

All logos are trademarks of their respective owners (Amazon, Microsoft, Google,
Alibaba, Tencent, Huawei, Cloudflare, DigitalOcean, Akamai/Linode). They are
bundled solely to identify each provider whose public status feed this extension
monitors, and do not imply any affiliation or endorsement. Replace any file with
an owner-supplied asset if a brand owner requests it.
