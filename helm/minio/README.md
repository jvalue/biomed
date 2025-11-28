# MinIO Helm Chart

This Helm chart deploys MinIO object storage using the official MinIO Helm chart as a dependency.

## Configuration

See [values.yaml](./values.yaml).

## Installation

1. Update dependencies:
```bash
cd helm/minio
helm dependency update
```

2. Install the chart:
```bash
helm upgrade --install minio . -n biomed --create-namespace
```

## Accessing MinIO

Get the MinIO root credentials:
```bash
export ROOT_USER=$(kubectl get secret --namespace biomed minio -o jsonpath="{.data.rootUser}" | base64 -d)
export ROOT_PASSWORD=$(kubectl get secret --namespace biomed minio -o jsonpath="{.data.rootPassword}" | base64 -d)
```

Port-forward to access the MinIO console:
```bash
kubectl port-forward --namespace biomed svc/minio-console 9001:9001
```

Then open http://localhost:9001 in your browser.

## Uninstall

```bash
helm uninstall minio -n biomed
```
