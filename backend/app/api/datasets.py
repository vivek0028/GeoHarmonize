from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
import os
import shutil
from typing import List
from datetime import datetime
from app.core.config import settings
from app.core.security import get_current_user_optional
from app.schemas.schemas import DatasetResponse, ValidationResult
from app.services.validation import validate_dataset_file
from app.database.connection import get_connection

router = APIRouter(prefix="/datasets", tags=["Datasets"])

@router.get("/", response_model=List[DatasetResponse])
def list_datasets():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, source, type, file_path, file_format, crs, feature_count, status, created_at FROM datasets ORDER BY id DESC;")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    
    datasets = []
    for r in rows:
        datasets.append(DatasetResponse(
            id=r["id"],
            name=r["name"],
            source=r["source"],
            type=r["type"],
            file_path=r["file_path"],
            file_format=r["file_format"],
            crs=r["crs"] or "EPSG:4326",
            feature_count=r["feature_count"] or 0,
            status=r["status"] or "ready",
            created_at=str(r["created_at"]) if r["created_at"] else ""
        ))
    return datasets

@router.post("/upload", response_model=DatasetResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    source: str = Form(...),
    dataset_type: str = Form(...),
    user: dict = Depends(get_current_user_optional)
):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in [".geojson", ".json"]:
        file_format = "GeoJSON"
    elif ext == ".csv":
        file_format = "CSV"
    elif ext in [".zip", ".shp"]:
        file_format = "Shapefile"
    elif ext in [".tif", ".tiff"]:
        file_format = "GeoTIFF"
    else:
        file_format = "Vector"

    target_path = os.path.join(settings.UPLOAD_DIR, filename)
    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    val_res = validate_dataset_file(target_path, file_format)
    
    conn = get_connection()
    cursor = conn.cursor()
    now_dt = datetime.utcnow()
    
    status = "ready" if val_res["file_readable"] else "validation_error"
    
    cursor.execute(
        """INSERT INTO datasets (name, source, type, file_path, file_format, crs, feature_count, status, uploaded_by, created_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
        (name, source, dataset_type, target_path, file_format, val_res["crs_detected"], val_res["feature_count"], status, user.get("id", 1), now_dt)
    )
    dataset_id = cursor.fetchone()["id"]
    
    cursor.execute(
        """INSERT INTO processing_jobs (dataset_id, dataset_name, job_type, status, progress, started_at, completed_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s);""",
        (dataset_id, name, "INGESTION_AND_VALIDATION", "COMPLETED", 100, now_dt, now_dt)
    )
    
    cursor.execute(
        """INSERT INTO audit_logs (user_name, action, entity, entity_id, old_value, new_value)
           VALUES (%s, %s, %s, %s, %s, %s);""",
        (user.get("name", "GIS Analyst"), "UPLOAD_DATASET", "Dataset", str(dataset_id), "None", f"{name} ({file_format})")
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return DatasetResponse(
        id=dataset_id,
        name=name,
        source=source,
        type=dataset_type,
        file_path=target_path,
        file_format=file_format,
        crs=val_res["crs_detected"],
        feature_count=val_res["feature_count"],
        status=status,
        created_at=str(now_dt)
    )

@router.get("/{dataset_id}/validate", response_model=ValidationResult)
def validate_dataset_endpoint(dataset_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path, file_format FROM datasets WHERE id = %s;", (dataset_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    file_path, file_format = row["file_path"], row["file_format"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk")
        
    res = validate_dataset_file(file_path, file_format)
    return ValidationResult(**res)
