"""Read-only metadata checks. No resource creation, queries or global MLflow setup."""


def connect(config, *, profile=None):
    from databricks.sdk import WorkspaceClient
    client = WorkspaceClient(**({'profile': profile} if profile else {'host': config.workspace_host}))
    verify_workspace(config, client)
    return client


def verify_workspace(config, client):
    if client.config.host.rstrip('/') != config.workspace_host.rstrip('/'):
        raise ValueError('Authenticated workspace does not match research configuration')


def check_services(config, client):
    verify_workspace(config, client)
    checks = {
        'catalog': lambda: client.catalogs.get(config.catalog),
        'schema': lambda: client.schemas.get(config.schema_name),
        'source_volume': lambda: client.volumes.read(config.volume_name),
        'mlflow': (lambda: client.experiments.get_by_name(config.experiment_name))
            if config.experiment_name else None,
        'ai_search': (lambda: client.vector_search_indexes.get_index(config.search_index))
            if config.search_index else None,
    }
    report = {}
    for name, check in checks.items():
        if check is None:
            report[name] = {'status': 'not_configured'}
            continue
        try:
            check()
            report[name] = {'status': 'reachable'}
        except Exception as exc:
            # Do not emit SDK messages, credentials, source content or response bodies.
            report[name] = {'status': 'failed', 'error_type': type(exc).__name__}
    return report
