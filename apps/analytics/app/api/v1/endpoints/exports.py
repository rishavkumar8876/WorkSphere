from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from app.services.streaming_exporter import StreamingExporter
from app.core.security import verify_service_api_key
from typing import List, Dict, Any

router = APIRouter()

@router.post(
    "/export/csv",
    dependencies=[Depends(verify_service_api_key)],
    summary="Stream Large Dataset as Chunked CSV"
)
async def export_csv(
    records: List[Dict[str, Any]],
    filename: str = Query("export.csv", description="Target filename")
):
    if not records:
        fieldnames = ["id", "title", "status", "priority", "created_at"]
    else:
        fieldnames = list(records[0].keys())

    generator = StreamingExporter.stream_csv(records, fieldnames)
    
    return StreamingResponse(
        generator,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post(
    "/export/json-stream",
    dependencies=[Depends(verify_service_api_key)],
    summary="Stream Large Dataset as Chunked JSON Array"
)
async def export_json_stream(
    records: List[Dict[str, Any]],
    filename: str = Query("export.json", description="Target filename")
):
    generator = StreamingExporter.stream_json_array(records)

    return StreamingResponse(
        generator,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
