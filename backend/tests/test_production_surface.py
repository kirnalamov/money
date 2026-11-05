def test_internal_endpoints_are_not_public_by_default():
    from app.main import app
    from app.core.config import settings

    if not settings.DEV_MODE and not settings.EXPOSE_INTERNAL_ENDPOINTS:
        paths = {route.path for route in app.routes}
        assert "/metrics" not in paths
        assert "/api/v1/docs" not in paths
        assert "/api/v1/openapi.json" not in paths


def test_production_response_has_no_timing_header():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.config import settings

    if not settings.DEV_MODE:
        assert "x-process-time" not in TestClient(app).get("/").headers
