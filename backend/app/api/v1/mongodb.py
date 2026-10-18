from __future__ import annotations
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_app_or_admin
from app.schemas.auth import UserInfo
from app.schemas.mongodb import (
    KdsMasterStatusToggleRequest,
    MongoConnectionCheckRequest,
    MongoConnectionCheckResponse,
    AppParamItem,
    AppParamUpdateRequest,
    AppParamCreateRequest,
    StandardAppParamItem,
    StandardAppParamCreateRequest,
    StandardAppParamUpdateRequest,
    SaveStandardParamsFromRestaurantRequest,
    SaveSingleStandardParamRequest,
    ApplyStandardParamsToRestaurantRequest,
    ApplyStandardParamsResponse,
    BatchApplyParamsRequest,
    BatchApplyParamsResponse,
    ScheduledParamJobItem,
    ScheduledParamJobCreateRequest,
    KitchenOverviewResponse,
    KdsItemsResponse,
    KdsCookingTimeUpdateRequest,
    KdsCookingTimeUpdateResponse,
    MasterDataSyncLogResponse,
    TableReportResponse,
    MongoDbOverviewResponse,
    MongoCollectionPreviewResponse,
    RestaurantLockStatusResponse,
    ClearTableLockRequest,
    ClearTableLockResponse,
    ActionLogSessionsResponse,
    ActionLogSessionDetailResponse,
    TabletUsersResponse,
    UnlockTabletUserRequest,
    UnlockTabletUserResponse,
    RestaurantGposInfoResponse,
    DishShowHideListResponse,
    DishShowHideSaveRequest,
    DishShowHideSaveResponse,
    MenuShowHideListResponse,
    MenuShowHideSaveRequest,
    MenuShowHideSaveResponse,
    KdsPlaceListResponse,
    KdsPlaceCreateRequest,
    KdsPlaceCreateResponse,
    KdsCreateFoodControlRequest,
    KdsCreateFoodControlResponse,
    KdsAssignDishQuayRequest,
    KdsAssignDishQuayResponse,
    KdsTransferQuayRequest,
    KdsTransferQuayResponse,
    KdsSyncGroupsByQuaysRequest,
    KdsSyncGroupsByQuaysResponse,
    KdsUpdateDishGroupRequest,
    KdsUpdateDishGroupResponse,
    KdsDeleteCookingConfigRequest,
    KdsDeleteCookingConfigResponse,
    KdsLogQueryRequest,
    KdsLogQueryResponse,
    KdsKitchenIntakeAnalysisRequest,
    KdsKitchenIntakeAnalysisResponse,
    KdsDishHistoryRequest,
    KdsDishHistoryResponse,
    KdsUpdatePlacePrinterRequest,
    KdsUpdatePlacePrinterResponse,
    KdsPlaceDeleteRequest,
    KdsPlaceDeleteResponse,
    KdsRenamePlaceRequest,
    KdsRenamePlaceResponse,
    KdsToggleFoodControlRequest,
    KdsToggleFoodControlResponse,
    KdsRoleUsersResponse,
    KdsRoleUserActionRequest,
    KdsRoleToggleStatusRequest,
    BatchRoleUserActionRequest,
    BatchRoleUserActionResponse,
    KdsMasterStatusResponse,
    MongoFixCpuRequest,
    MongoFixCpuResponse,
    MongoFixCpuConfigResponse,
    MongoFixCpuConfigRequest,
    MongoScanMachinesRequest,
    MongoScanMachinesResponse,
    MongoInspectPairRequest,
    MongoInspectPairResponse,
    MongoTransferExecuteRequest,
    MongoTransferExecuteResponse,
    MongoTransferSettingsResponse,
    MongoTransferSettingsUpdateRequest,
    MenuCategoriesResponse,
    LoadMenuItemsRequest,
    LoadMenuItemsResponse,
    BulkAddDishesRequest,
    BulkAddDishesResponse,
    UpdateDishItemRequest,
    UpdateDishItemResponse,
    DeleteDishesRequest,
    DeleteDishesResponse,
    MoveCloneDishesRequest,
    MoveCloneDishesResponse,
    CheckConflictsResponse,
    ResolveConflictRequest,
    ResolveConflictResponse,
    ActivateCoRequest,
    ActivateCoResponse,
    DeactivateCoRequest,
    DeactivateCoResponse,
    SyncAllSoCoRequest,
    SyncAllSoCoResponse,
    SaveMenuSnapshotRequest,
    SaveMenuSnapshotResponse,
    DeployMenuSnapshotRequest,
    DeployMenuSnapshotResponse,
    DirectSyncMenuRequest,
    DirectSyncMenuResponse,
    DishLookupResponse
)
from app.services.mongodb_service import (
    MongoDBService,
    get_transfer_default_tails,
    save_transfer_default_tails
)
from app.services.mongo_fix_cpu_service import mongo_fix_cpu_service
from app.services import mongo_menu_so_co_service
from app.services.log_service import LogService



router = APIRouter(prefix="/mongodb", tags=["MongoDB Restaurant"])


@router.post("/check-connection", response_model=MongoConnectionCheckResponse)
async def check_restaurant_mongo_connection(
    payload: MongoConnectionCheckRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Kiểm tra thực tế dải mạng của nhà hàng (IP Subnet: .11, .12, .41 trên cổng 27017).
    """
    try:
        return await MongoDBService.check_connection(
            db=db,
            restaurant_id=payload.restaurant_id,
            ip=payload.ip
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi kiểm tra kết nối MongoDB nhà hàng: {str(e)}"
        )


@router.get("/params", response_model=List[AppParamItem])
def get_app_params(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    search: Optional[str] = Query(None, description="Tìm kiếm Param Code, Tên, Note, Value"),
    param_type: Optional[str] = Query(None, description="Lọc theo kiểu (FUNCTION, CONFIG)"),
    status: Optional[int] = Query(None, description="Lọc theo trạng thái (1: Bật, 0: Tắt)"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Tải danh sách các tham số trong bảng APP_PARAM từ database G_ORDER của nhà hàng.
    """
    try:
        return MongoDBService.get_app_params(
            host=host,
            port=port,
            search=search,
            param_type=param_type,
            status=status
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tải dữ liệu APP_PARAM từ MongoDB ({host}:{port}): {str(e)}"
        )


@router.put("/params/{param_code}")
def update_app_param(
    param_code: str,
    payload: AppParamUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Chỉnh sửa tham số trong bảng APP_PARAM của nhà hàng.
    """
    try:
        return MongoDBService.update_app_param(
            db=db,
            current_user=current_user,
            param_code=param_code,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật tham số '{param_code}': {str(e)}"
        )


@router.post("/params")
def create_app_param(
    payload: AppParamCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Thêm mới một tham số vào bảng APP_PARAM của nhà hàng.
    """
    try:
        return MongoDBService.create_app_param(
            db=db,
            current_user=current_user,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thêm mới tham số '{payload.paramCode}': {str(e)}"
        )


@router.delete("/params/{param_code}")
def delete_app_param(
    param_code: str,
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xóa một tham số khỏi bảng APP_PARAM trong MongoDB nhà hàng.
    """
    try:
        return MongoDBService.delete_app_param(
            db=db,
            current_user=current_user,
            param_code=param_code,
            host=host,
            port=port
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa tham số '{param_code}': {str(e)}"
        )


# ==========================================================
# ENDPOINTS QUẢN LÝ BỘ PARAM CHUẨN (STANDARD APP PARAMS)
# ==========================================================

@router.get("/standard-params", response_model=List[StandardAppParamItem])
def get_standard_app_params(
    search: Optional[str] = Query(None, description="Tìm kiếm Param Code, Tên, Note, Value"),
    param_type: Optional[str] = Query(None, description="Lọc theo kiểu (FUNCTION, CONFIG)"),
    status: Optional[int] = Query(None, description="Lọc theo trạng thái (1: Bật, 0: Tắt)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách các tham số trong Bộ Param Chuẩn lưu trên SQL Server.
    """
    try:
        return MongoDBService.get_standard_app_params(
            db=db,
            search=search,
            param_type=param_type,
            status=status
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải danh sách Bộ Param Chuẩn: {str(e)}"
        )


@router.post("/standard-params", response_model=StandardAppParamItem)
def create_standard_app_param(
    payload: StandardAppParamCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Thêm mới một tham số vào Bộ Param Chuẩn trên hệ thống.
    """
    try:
        return MongoDBService.create_standard_app_param(
            db=db,
            current_user=current_user,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo tham số chuẩn '{payload.param_code}': {str(e)}"
        )


@router.post("/standard-params/save-single", response_model=StandardAppParamItem)
def save_single_standard_param(
    payload: SaveSingleStandardParamRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lưu một tham số cụ thể từ nhà hàng vào Bộ Param Chuẩn trên SQL Server.
    """
    try:
        return MongoDBService.save_single_standard_param(
            db=db,
            current_user=current_user,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lưu tham số '{payload.param_code}' vào bộ chuẩn: {str(e)}"
        )


@router.post("/standard-params/save-from-restaurant")
def save_standard_params_from_restaurant(
    payload: SaveStandardParamsFromRestaurantRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lưu / đồng bộ các tham số APP_PARAM từ một nhà hàng đang kết nối vào Bộ Param Chuẩn.
    """
    try:
        return MongoDBService.save_standard_params_from_restaurant(
            db=db,
            current_user=current_user,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lưu param từ nhà hàng vào bộ chuẩn: {str(e)}"
        )


@router.post("/standard-params/apply-to-restaurant", response_model=ApplyStandardParamsResponse)
def apply_standard_params_to_restaurant(
    payload: ApplyStandardParamsToRestaurantRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Áp dụng Bộ Param Chuẩn xuống MongoDB (APP_PARAM) của một nhà hàng.
    Hỗ trợ 2 chế độ:
    - 'overwrite': Ghi đè các tham số đã trùng trên nhà hàng bằng giá trị chuẩn.
    - 'skip_existing': Giữ nguyên giá trị cũ trên nhà hàng nếu đã có, chỉ thêm các tham số mới còn thiếu.
    """
    try:
        return MongoDBService.apply_standard_params_to_restaurant(
            db=db,
            current_user=current_user,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi áp dụng param chuẩn xuống nhà hàng: {str(e)}"
        )


@router.put("/standard-params/{param_code}", response_model=StandardAppParamItem)
def update_standard_app_param(
    param_code: str,
    payload: StandardAppParamUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Chỉnh sửa tham số trong Bộ Param Chuẩn trên hệ thống.
    """
    try:
        return MongoDBService.update_standard_app_param(
            db=db,
            current_user=current_user,
            param_code=param_code,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật tham số chuẩn '{param_code}': {str(e)}"
        )


@router.delete("/standard-params/{param_code}")
def delete_standard_app_param(
    param_code: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xóa một tham số khỏi Bộ Param Chuẩn trên hệ thống.
    """
    try:
        return MongoDBService.delete_standard_app_param(
            db=db,
            current_user=current_user,
            param_code=param_code
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa tham số chuẩn '{param_code}': {str(e)}"
        )


@router.post("/batch-apply-params", response_model=BatchApplyParamsResponse)
def batch_apply_params(
    payload: BatchApplyParamsRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Đẩy / áp dụng cấu hình param xuống hàng loạt nhà hàng ngay lập tức.
    Hỗ trợ tuỳ chọn: 'upsert', 'overwrite', 'skip_existing'.
    """
    try:
        return MongoDBService.batch_apply_params(
            db=db,
            current_user=current_user,
            payload=payload
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi đẩy param hàng loạt xuống nhà hàng: {str(e)}"
        )


@router.get("/scheduled-param-jobs", response_model=List[ScheduledParamJobItem])
def get_scheduled_param_jobs(
    status: Optional[str] = Query(None, description="Lọc theo trạng thái: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách các tác vụ hẹn giờ đẩy param xuống nhà hàng.
    """
    try:
        return MongoDBService.get_scheduled_param_jobs(db=db, status=status)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lấy danh sách lịch hẹn giờ: {str(e)}"
        )


@router.post("/scheduled-param-jobs", response_model=ScheduledParamJobItem)
def create_scheduled_param_job(
    payload: ScheduledParamJobCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Tạo mới một lịch hẹn giờ đẩy cấu hình param xuống nhà hàng theo ngày & giờ cố định.
    """
    try:
        return MongoDBService.create_scheduled_param_job(
            db=db,
            current_user=current_user,
            payload=payload
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo lịch hẹn giờ đẩy param: {str(e)}"
        )


@router.delete("/scheduled-param-jobs/{job_id}")
def delete_scheduled_param_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xoá hoặc huỷ lịch hẹn giờ đẩy param.
    """
    try:
        return MongoDBService.delete_scheduled_param_job(
            db=db,
            current_user=current_user,
            job_id=job_id
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa lịch hẹn giờ #{job_id}: {str(e)}"
        )


@router.post("/scheduled-param-jobs/{job_id}/run-now")
def run_scheduled_param_job_now(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Kích hoạt chạy ngay lập tức tác vụ hẹn giờ đã cấu hình.
    """
    try:
        return MongoDBService.run_scheduled_param_job_now(
            db=db,
            current_user=current_user,
            job_id=job_id
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi chạy lịch hẹn giờ #{job_id}: {str(e)}"
        )


@router.get("/kitchen-overview", response_model=KitchenOverviewResponse)
def get_kitchen_overview(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách các bảng (collections) và số lượng bản ghi trong database G_KITCHEN.
    """
    try:
        return MongoDBService.get_kitchen_overview(host=host, port=port)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể kết nối vào database G_KITCHEN ({host}:{port}): {str(e)}"
        )


@router.get("/kds-items", response_model=KdsItemsResponse)
def get_kds_items(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    search: Optional[str] = Query(None, description="Tìm kiếm Tên món, Mã món, Mã SAP"),
    price_status: Optional[str] = Query(None, description="Lọc theo trạng thái giá (MATCH, DIFF, NO_PRICE)"),
    group_kds: Optional[str] = Query(None, description="Lọc theo nhóm KDS"),
    quay: Optional[str] = Query(None, description="Lọc theo Quầy / Bộ phận bếp (ACCOUNT)"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách món ăn từ bếp KDS (G_KITCHEN.CONFIG_COOKING),
    kèm phân nhóm theo Quầy (G_KITCHEN.ACCOUNT), mã SAP, thời gian chế biến chuẩn, và đối chiếu giá bán giữa các bảng GPOS.
    """
    try:
        return MongoDBService.get_kds_items(
            host=host,
            port=port,
            search=search,
            price_status=price_status,
            group_kds=group_kds,
            quay=quay
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tải danh sách Check Item KDS ({host}:{port}): {str(e)}"
        )


@router.post("/kds-items/cooking-time", response_model=KdsCookingTimeUpdateResponse)
def update_kds_cooking_time(
    payload: KdsCookingTimeUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """
    Cập nhật thời gian chế biến (singleCookingTime) cho món ăn cụ thể trong bảng CONFIG_COOKING của bếp KDS (G_KITCHEN).
    """
    try:
        return MongoDBService.update_kds_cooking_time(
            current_user=current_user,
            payload=payload,
            db=db,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật thời gian chế biến món: {str(e)}"
        )


@router.get("/master-data-sync-logs", response_model=MasterDataSyncLogResponse)
def get_master_data_sync_logs(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    db_name: str = Query("G_ORDER", description="Tên Database (G_ORDER hoặc G_KITCHEN)"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên bảng (collection), trạng thái (logMess), thời gian"),
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    limit: int = Query(200, description="Số lượng bản ghi tối đa (mặc định 200)"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách nhật ký đồng bộ Master Data (MASTER_DATA_SYNC_LOG) từ G_ORDER hoặc G_KITCHEN,
    sắp xếp gần nhất trước, hiển thị thời gian đồng bộ, trạng thái thành công/thất bại và thời gian xử lý.
    """
    try:
        return MongoDBService.get_master_data_sync_logs(
            host=host,
            port=port,
            db_name=db_name,
            search=search,
            from_date=from_date,
            to_date=to_date,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tải nhật ký đồng bộ MASTER_DATA_SYNC_LOG ({host}:{port}): {str(e)}"
        )


@router.get("/table-report", response_model=TableReportResponse)
def get_table_report(
    restaurant_id: Optional[int] = Query(None, description="ID nhà hàng (để trống nếu xuất tất cả)"),
    host: Optional[str] = Query(None, description="IP máy chủ MongoDB cụ thể"),
    split_by_hall: bool = Query(False, description="Chia theo từng Khu vực / Tầng (HALL_PLAN)"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm nhanh"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Báo cáo danh sách bàn theo nhà hàng từ MongoDB (G_ORDER.TABLE & G_ORDER.HALL_PLAN).
    Hỗ trợ xuất từng nhà hàng hoặc toàn bộ nhà hàng đang hoạt động (ON/NEW).
    """
    try:
        return MongoDBService.get_table_report(
            db=db,
            restaurant_id=restaurant_id,
            host=host,
            split_by_hall=split_by_hall,
            search=search
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi trích xuất báo cáo danh sách bàn: {str(e)}"
        )


@router.get("/database-overview", response_model=MongoDbOverviewResponse)
def get_database_overview(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    db_name: str = Query("G_ORDER", description="Tên Database (G_ORDER hoặc G_KITCHEN)"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách tất cả các bảng (collections) trong database G_ORDER hoặc G_KITCHEN
    kèm theo số lượng bản ghi và các trường dữ liệu mẫu.
    """
    try:
        return MongoDBService.get_database_overview(
            host=host,
            port=port,
            db_name=db_name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tải thông tin database {db_name} ({host}:{port}): {str(e)}"
        )


@router.get("/collection-preview", response_model=MongoCollectionPreviewResponse)
def get_collection_preview(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    db_name: str = Query("G_ORDER", description="Tên Database (G_ORDER hoặc G_KITCHEN)"),
    collection_name: str = Query("TABLE", description="Tên collection cần xem mẫu"),
    limit: int = Query(20, ge=1, le=100, description="Số lượng document xem trước (tối đa 100)"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xem trước các document mẫu trong một collection bất kỳ của G_ORDER hoặc G_KITCHEN.
    """
    try:
        return MongoDBService.get_collection_preview(
            host=host,
            port=port,
            db_name=db_name,
            collection_name=collection_name,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xem trước dữ liệu bảng {collection_name} ({host}:{port}): {str(e)}"
        )


@router.get("/locked-tables", response_model=RestaurantLockStatusResponse)
def get_locked_tables(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    restaurant_id: Optional[int] = Query(None, description="ID Nhà Hàng"),
    date_scope: str = Query("today", description="Phạm vi ngày: today | yesterday | all | YYYY-MM-DD"),
    include_overnight: bool = Query(False, description="Bao gồm đơn tồn qua đêm khi lọc hôm nay"),
    custom_date: Optional[str] = Query(None, description="Ngày cụ thể (YYYY-MM-DD) nếu cần"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Quét danh sách các bàn đang bị khóa, các phiên tablet đang chiếm giữ (LOCK_ORDER),
    và đọc cấu hình mật khẩu thoát bàn (PASSWORD_EXIT_TABLE), quyền mở khóa (ROLE_UNLOCK_ORDER).
    Hỗ trợ lọc theo ngày: mặc định chỉ load ngày hiện tại (today).
    """
    try:
        return MongoDBService.get_locked_tables(
            host=host,
            port=port,
            restaurant_id=restaurant_id,
            db_session=db,
            date_scope=date_scope,
            include_overnight=include_overnight,
            custom_date=custom_date
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể kiểm tra khóa bàn ({host}:{port}): {str(e)}"
        )


@router.post("/clear-table-locks", response_model=ClearTableLockResponse)
def clear_table_locks(
    payload: ClearTableLockRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xóa toàn bộ các khóa phiên Tablet (xóa LOCK_ORDER, reset lstTgsUser, lockOrder, locked, isLock trong ORDER),
    giải phóng ngay lập tức các user tablet đang chiếm giữ bàn.
    Hỗ trợ hành động dọn rác mồ côi (clean_orphans_only).
    """
    host = payload.host
    if not host and payload.restaurant_id:
        from app.models.restaurant import Restaurant
        rest = db.get(Restaurant, payload.restaurant_id)
        if rest:
            host = rest.ip

    if not host:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu thông tin host hoặc restaurant_id"
        )

    try:
        res = MongoDBService.clear_table_locks(
            host=host,
            port=payload.port,
            guid=payload.guid,
            table_name=payload.table_name,
            reopen_pre_payment=payload.reopen_pre_payment,
            clean_orphan_locks=payload.clean_orphan_locks,
            action=payload.action,
            restaurant_id=payload.restaurant_id,
            db_session=db
        )
        if res and getattr(res, "success", False):
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="GPOS_TABLET_LOCK",
                hanh_dong="CLEAR_LOCK",
                noi_dung=f"Xóa khóa bàn ({payload.action or 'LOCK'}) trên {host}: {res.message}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi xóa khóa bàn ({host}): {str(e)}"
        )


@router.get("/tablet-users", response_model=TabletUsersResponse)
def get_tablet_users(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    restaurant_id: Optional[int] = Query(None, description="ID Nhà Hàng"),
    search: Optional[str] = Query(None, description="Tìm theo mã NV hoặc tên"),
    only_logged_in: bool = Query(True, description="Chỉ hiện user đang có cờ đăng nhập hoặc giữ bàn"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Quét danh sách nhân viên từ EMPLOYEE và LOCK_ORDER, phát hiện tài khoản nào đang có cờ isLogin=True
    hoặc đang chiếm giữ bàn, phục vụ mở khóa tablet.
    """
    try:
        return MongoDBService.get_tablet_users(
            host=host,
            port=port,
            restaurant_id=restaurant_id,
            search=search,
            only_logged_in=only_logged_in,
            db_session=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi tải danh sách user tablet ({host}:{port}): {str(e)}"
        )


@router.post("/unlock-tablet-user", response_model=UnlockTabletUserResponse)
def unlock_tablet_user(
    payload: UnlockTabletUserRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Mở khóa cho 1 hoặc toàn bộ nhân viên bị báo 'đang đăng nhập ở thiết bị khác'.
    Reset cờ isLogin trong EMPLOYEE, gỡ user khỏi LOCK_ORDER và lstTgsUser trong ORDER.
    """
    host = payload.host
    if not host and payload.restaurant_id:
        from app.models.restaurant import Restaurant
        rest = db.get(Restaurant, payload.restaurant_id)
        if rest:
            host = rest.ip

    if not host:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thiếu thông tin host hoặc restaurant_id"
        )

    try:
        res = MongoDBService.unlock_tablet_user(
            host=host,
            port=payload.port,
            user_code=payload.user_code,
            user_name=payload.user_name,
            unlock_all=payload.unlock_all,
            restaurant_id=payload.restaurant_id,
            db_session=db
        )
        if res and getattr(res, "success", False):
            target_label = "toàn bộ nhân viên" if payload.unlock_all else f"nhân viên {payload.user_name or payload.user_code or ''}"
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="GPOS_TABLET_USER",
                hanh_dong="UNLOCK",
                noi_dung=f"Mở khóa {target_label} trên máy {host}: {res.message}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi mở khóa user ({host}): {str(e)}"
        )


@router.get("/action-log-sessions", response_model=ActionLogSessionsResponse)
def get_action_log_sessions(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    date: Optional[str] = Query(None, description="Ngày lọc (YYYY-MM-DD), mặc định là hôm nay"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo Tên bàn, Mã đơn hoặc GUID"),
    limit: int = Query(100, ge=1, le=300, description="Số lượng phiên tối đa (mặc định 100)"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Quét danh sách các phiên thao tác (nhóm theo GUID) trong ACTION_LOG theo ngày,
    sắp xếp thời gian mới nhất. Kết hợp dữ liệu từ ORDER để hiển thị tên bàn, trạng thái đơn.
    """
    try:
        return MongoDBService.get_action_log_sessions(
            host=host,
            port=port,
            date_str=date,
            search=search,
            limit=limit
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tải nhật ký thao tác ACTION_LOG ({host}:{port}): {str(e)}"
        )


@router.get("/action-log-details", response_model=ActionLogSessionDetailResponse)
def get_action_log_session_detail(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    guid: str = Query(..., description="Mã GUID phiên cần xem chi tiết"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xem chi tiết toàn bộ các action log theo trình tự thời gian của một phiên (GUID),
    kết hợp dữ liệu từ ACTION_LOG, ORDER_ACTION_LOG và thông tin đơn hàng ORDER.
    """
    try:
        return MongoDBService.get_action_log_session_detail(
            host=host,
            port=port,
            guid=guid
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể tải chi tiết phiên {guid} ({host}:{port}): {str(e)}"
        )


@router.get("/restaurant-info", response_model=RestaurantGposInfoResponse)
def get_restaurant_gpos_info(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    restaurant_id: Optional[int] = Query(None, description="ID Nhà Hàng"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy thông tin tổng hợp của nhà hàng phục vụ hiển thị header:
    Tên Nhà Hàng, Mã RK7, G-POS Version CO/SO, G-POS Version KDS.
    """
    try:
        return MongoDBService.get_restaurant_gpos_info(
            host=host,
            port=port,
            restaurant_id=restaurant_id,
            db_session=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lấy thông tin nhà hàng ({host}:{port}): {str(e)}"
        )


@router.get("/dish-show-hide", response_model=DishShowHideListResponse)
def get_dish_show_hide(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    search: Optional[str] = Query(None, description="Tìm kiếm tên món hoặc mã món"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách món đang hiển thị và đang ẩn tại nhà hàng:
    - Món hiện: các món từ DISH_CACHE không bị ẩn
    - Món ẩn: các món trong SHOW_HIDE_ITEMS có ít nhất 1 kênh bị ẩn (QrOrder, CO, SO)
    """
    try:
        return MongoDBService.get_dish_show_hide(
            host=host,
            port=port,
            search=search
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lấy danh sách món ẩn/hiện ({host}:{port}): {str(e)}"
        )


@router.post("/dish-show-hide", response_model=DishShowHideSaveResponse)
def save_dish_show_hide(
    payload: DishShowHideSaveRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lưu cập nhật danh sách món ẩn/hiện vào SHOW_HIDE_ITEMS của database G_ORDER:
    - Chuyển món sang ẩn: Lưu/Cập nhật cờ showInCO, showInSO, showInQrOrder
    - Chuyển món sang hiện: Xóa khỏi SHOW_HIDE_ITEMS hoặc bật cả 3 cờ kênh
    """
    try:
        return MongoDBService.save_dish_show_hide(
            current_user=current_user,
            payload=payload,
            db_session=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lưu cấu hình ẩn/hiện món ({payload.host}): {str(e)}"
        )


@router.get("/menu-show-hide", response_model=MenuShowHideListResponse)
def get_menu_show_hide(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách danh mục menu từ RESTAURANT_CATEGORY kèm theo:
    Mã SAP, Mã RK7, Tên menu và cấu hình 4 kênh: CO, SO, QrOrder, KDS Auto.
    """
    try:
        return MongoDBService.get_menu_show_hide(
            host=host,
            port=port
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lấy danh mục menu ({host}:{port}): {str(e)}"
        )


@router.post("/menu-show-hide", response_model=MenuShowHideSaveResponse)
def save_menu_show_hide(
    payload: MenuShowHideSaveRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lưu cập nhật cấu hình danh mục menu vào RESTAURANT_CATEGORY:
    Cập nhật các cờ showInCo, showInSo, showInQrOrder, và autoDeliveryInSo (KDS tự động ra món).
    """
    try:
        return MongoDBService.save_menu_show_hide(
            current_user=current_user,
            payload=payload,
            db_session=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lưu cấu hình danh mục menu ({payload.host}): {str(e)}"
        )


@router.get("/kds-places", response_model=KdsPlaceListResponse)
def get_kds_places(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách các quầy bếp (places) từ CONFIG_KDS kèm thông tin máy in và danh sách tài khoản tương ứng.
    """
    try:
        return MongoDBService.get_kds_places(host=host, port=port)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lấy danh sách quầy KDS ({host}:{port}): {str(e)}"
        )


@router.post("/kds-places", response_model=KdsPlaceCreateResponse)
def create_kds_place(
    payload: KdsPlaceCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Thêm quầy KDS mới vào CONFIG_KDS kèm máy in, và tạo tài khoản đăng nhập tương ứng trong bảng ACCOUNT.
    """
    try:
        return MongoDBService.add_kds_quay_account(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi tạo quầy KDS ({payload.host}): {str(e)}"
        )


@router.post("/kds-dishes/assign-quay", response_model=KdsAssignDishQuayResponse)
def assign_dish_kds_quay(
    payload: KdsAssignDishQuayRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Gán món ăn vào quầy KDS mới hoặc cập nhật quầy cho món trong CONFIG_COOKING.
    """
    try:
        return MongoDBService.assign_dish_kds_quay(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi gán món vào quầy ({payload.host}): {str(e)}"
        )


@router.post("/kds-dishes/transfer-quay", response_model=KdsTransferQuayResponse)
def transfer_kds_dishes_quay(
    payload: KdsTransferQuayRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Chuyển toàn bộ hoặc một phần món ăn từ quầy bếp này sang quầy bếp khác trong CONFIG_COOKING.
    """
    try:
        return MongoDBService.transfer_kds_dishes_quay(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi chuyển quầy món ăn ({payload.host}): {str(e)}"
        )


@router.post("/kds-sync-groups-by-quays", response_model=KdsSyncGroupsByQuaysResponse)
def sync_kds_groups_by_quays(
    payload: KdsSyncGroupsByQuaysRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Đồng nhất Nhóm Bếp (groupTypeKds) theo Quầy Bếp (places) cho toàn bộ món ăn trong CONFIG_COOKING.
    Món thuộc quầy nào sẽ có nhóm bếp mang tên và mã quầy đó, xóa bỏ hoàn toàn tình trạng nhóm 'ALL' hoặc 'Bếp Nóng & Nướng' sai lệch.
    """
    try:
        return MongoDBService.sync_kds_groups_by_quays(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi đồng nhất nhóm bếp theo quầy ({payload.host}): {str(e)}"
        )


@router.post("/kds-dishes/update-group", response_model=KdsUpdateDishGroupResponse)
def update_kds_dish_group(
    payload: KdsUpdateDishGroupRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Chỉnh sửa trực tiếp tên Nhóm Bếp (groupTypeKds) cho 1 hoặc nhiều món ăn trong CONFIG_COOKING.
    """
    try:
        return MongoDBService.update_kds_dish_group(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi cập nhật nhóm bếp ({payload.host}): {str(e)}"
        )


@router.post("/kds-dishes/delete-config", response_model=KdsDeleteCookingConfigResponse)
def delete_kds_cooking_config(
    payload: KdsDeleteCookingConfigRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Gỡ bỏ món ăn khỏi CONFIG_COOKING (Dành cho các món không cần bếp nấu: Vé Buffet, Nước ngọt lon, Khăn lạnh...).
    Khi gỡ, món sẽ không bao giờ bị đẩy vào KDS hoặc tính trễ oan khi thu ngân đóng bàn.
    """
    try:
        return MongoDBService.delete_kds_cooking_config(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi gỡ món khỏi KDS ({payload.host}): {str(e)}"
        )


@router.post("/kds-logs", response_model=KdsLogQueryResponse)
def get_kds_logs(
    payload: KdsLogQueryRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Tra cứu nhật ký KDS: Thời gian order từ SO/CO vào bếp, thời gian bấm Done món trên KDS,
    thời gian thực tế ra món, thời gian chuẩn cấu hình và độ trễ.
    """
    try:
        return MongoDBService.get_kds_logs(
            payload=payload,
            current_user=current_user
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi tra cứu nhật ký KDS ({payload.host}): {str(e)}"
        )


@router.post("/kds-analyze-intake", response_model=KdsKitchenIntakeAnalysisResponse)
def analyze_kds_kitchen_intake(
    payload: KdsKitchenIntakeAnalysisRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Phân tích tổng số món và số lượt gửi vào bếp (Kitchen Intake Analysis):
    - Thống kê song song: Theo Món (Dishes) và Theo Lượt (Batches).
    - Phân tích theo khoảng thời gian (tối đa 5 ngày).
    - Phân rã theo từng Quầy Bếp (Places), theo Ngày (Dates) và theo Khung Giờ (Hours).
    """
    try:
        return MongoDBService.analyze_kds_kitchen_intake(
            payload=payload,
            current_user=current_user
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi phân tích món vào bếp KDS ({payload.host}): {str(e)}"
        )


@router.post("/kds-dish-history", response_model=KdsDishHistoryResponse)
def get_kds_dish_history(
    payload: KdsDishHistoryRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Soi lịch sử món KDS: tra cứu toàn diện quá trình order/ra món của món trong LOG_DISH_FINISH_ITEM,
    kiểm tra trạng thái cấu hình CONFIG_COOKING hiện tại, trạng thái ẩn/hiện, báo hết món,
    và tự động phân tích đối soát lý do món xuất hiện trên KDS (cơ chế fallback group ALL).
    """
    try:
        return MongoDBService.get_kds_dish_history(
            current_user=current_user,
            payload=payload
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi tra cứu lịch sử món KDS ({payload.host}): {str(e)}"
        )


@router.put("/kds-places/printer", response_model=KdsUpdatePlacePrinterResponse)
def update_kds_place_printer(
    payload: KdsUpdatePlacePrinterRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Cập nhật máy in tương ứng cho một quầy KDS trong CONFIG_KDS và bảng ACCOUNT.
    """
    try:
        return MongoDBService.update_kds_place_printer(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi cập nhật máy in quầy ({payload.host}): {str(e)}"
        )


@router.put("/kds-places/{place_id}/rename", response_model=KdsRenamePlaceResponse)
def rename_kds_place(
    place_id: int,
    payload: KdsRenamePlaceRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Đổi tên quầy KDS: cập nhật name + tự sinh placeCode mới theo tên,
    đồng bộ sang ACCOUNT.listPlace và accName của tài khoản quầy con (role=3).
    """
    try:
        payload.place_id = place_id
        return MongoDBService.rename_kds_place(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi đổi tên quầy KDS ID {place_id}: {str(e)}"
        )


@router.post("/kds-create-food-control", response_model=KdsCreateFoodControlResponse)
def create_kds_food_control(
    payload: KdsCreateFoodControlRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Tạo bổ sung quầy & account Food control (Role: 2) cho nhà hàng chưa có Food control.
    Nếu nhà hàng đã có quầy/account này rồi thì không cho phép tạo trùng lặp.
    """
    try:
        return MongoDBService.create_kds_food_control(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi tạo Food Control: {str(e)}"
        )


@router.delete("/kds-places/{place_id}", response_model=KdsPlaceDeleteResponse)
def delete_kds_place(
    place_id: int,
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xóa một quầy bếp khỏi CONFIG_KDS, gỡ quầy khỏi danh sách quản lý của Food control,
    xóa tài khoản trạm tương ứng trong ACCOUNT và gỡ quầy khỏi tất cả các món ăn trong CONFIG_COOKING.
    Yêu cầu xác nhận kỹ 2 lần ở giao diện. Quầy FOODCONTROL (ID=0) không thể xóa.
    """
    try:
        payload = KdsPlaceDeleteRequest(host=host, port=port, place_id=place_id)
        return MongoDBService.delete_kds_quay(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi xóa quầy KDS ID {place_id} ({host}:{port}): {str(e)}"
        )


@router.put("/kds-places/{place_id}/toggle-food-control", response_model=KdsToggleFoodControlResponse)
def toggle_kds_food_control(
    place_id: int,
    payload: KdsToggleFoodControlRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Bỏ hoặc Thêm một quầy bất kỳ vào danh sách trạm quản lý của Food Control (ACCOUNT.listPlace).
    action = 'include' (thêm vào) hoặc 'exclude' (bỏ ra).
    """
    try:
        payload.place_id = place_id
        return MongoDBService.toggle_kds_food_control(
            current_user=current_user,
            payload=payload,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi cập nhật Food Control cho quầy ID {place_id} ({payload.host}): {str(e)}"
        )


@router.get("/kds-role-users", response_model=KdsRoleUsersResponse)
def get_kds_role_users(
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    restaurant_code: Optional[str] = Query(None, description="Mã nhà hàng (nếu có)"),
    search: Optional[str] = Query(None, description="Tìm kiếm mã hoặc tên nhân viên"),
    param_code: str = Query("ROLE_SETUP_CONFIG_COOKING", description="Mã tham số phân quyền trong G_ORDER.APP_PARAM"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy danh sách các tài khoản / nhân viên có quyền cấu hình (ROLE_SETUP_CONFIG_COOKING hoặc ROLE_SETUP_SHOW_HIDE_ITEM trong G_ORDER.APP_PARAM).
    """
    try:
        return MongoDBService.get_kds_role_users(
            host=host,
            port=port,
            restaurant_code=restaurant_code,
            search=search,
            param_code=param_code
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lấy danh sách user quyền ({host}:{port}): {str(e)}"
        )


@router.post("/kds-role-users", response_model=KdsRoleUsersResponse)
def add_kds_role_user(
    payload: KdsRoleUserActionRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Thêm mã nhân viên / user vào quyền cấu hình (ROLE_SETUP_CONFIG_COOKING hoặc ROLE_SETUP_SHOW_HIDE_ITEM).
    """
    try:
        return MongoDBService.add_kds_role_user(
            payload=payload,
            current_user=current_user,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi thêm user quyền ({payload.host}): {str(e)}"
        )


@router.delete("/kds-role-users/{user_code}", response_model=KdsRoleUsersResponse)
def remove_kds_role_user(
    user_code: str,
    host: str = Query(..., description="IP máy chủ MongoDB"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    param_code: str = Query("ROLE_SETUP_CONFIG_COOKING", description="Mã tham số phân quyền"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Xóa mã nhân viên / user khỏi quyền cấu hình (ROLE_SETUP_CONFIG_COOKING hoặc ROLE_SETUP_SHOW_HIDE_ITEM).
    """
    try:
        payload = KdsRoleUserActionRequest(host=host, port=port, user_code=user_code, param_code=param_code)
        return MongoDBService.remove_kds_role_user(
            payload=payload,
            current_user=current_user,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi xóa user quyền KDS '{user_code}' ({host}): {str(e)}"
        )


@router.put("/kds-role-users/toggle-status", response_model=KdsRoleUsersResponse)
def toggle_kds_role_status(
    payload: KdsRoleToggleStatusRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Bật (status = 1) hoặc Tắt (status = 0) tham số ROLE_SETUP_CONFIG_COOKING trong bảng APP_PARAM của G_ORDER.
    """
    try:
        return MongoDBService.toggle_kds_role_status(
            payload=payload,
            current_user=current_user,
            db=db
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi đổi trạng thái ROLE_SETUP_CONFIG_COOKING ({payload.host}): {str(e)}"
        )


@router.post("/batch-role-user-action", response_model=BatchRoleUserActionResponse)
async def execute_batch_role_user_action(
    payload: BatchRoleUserActionRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Thực thi cấu hình phân quyền (ROLE_SETUP_SHOW_HIDE_ITEM hoặc ROLE_SETUP_CONFIG_COOKING)
    hàng loạt cho danh sách nhiều nhà hàng:
    - Bật/Tắt status hàng loạt
    - Thêm/Ghi đè/Gỡ bỏ danh sách mã user hàng loạt
    """
    try:
        return await MongoDBService.execute_batch_role_user_action(
            payload=payload,
            current_user=current_user,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi thực thi phân quyền hàng loạt: {str(e)}"
        )


@router.get("/kds-master-status", response_model=KdsMasterStatusResponse)
def get_kds_master_status(
    host: str = Query(..., description="IP MongoDB Nhà Hàng"),
    port: int = Query(27017, description="Port MongoDB"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy trạng thái cấu hình Bật/Tắt hoàn toàn KDS (tham số SHOW_KDS trong G_ORDER.APP_PARAM).
    """
    try:
        return MongoDBService.get_kds_master_status(host=host, port=port)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi lấy trạng thái SHOW_KDS ({host}:{port}): {str(e)}"
        )


@router.put("/kds-master-status/toggle", response_model=KdsMasterStatusResponse)
def toggle_kds_master_status(
    payload: KdsMasterStatusToggleRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Bật hoặc Tắt hoàn toàn việc sử dụng KDS tại nhà hàng bằng cách cập nhật tham số SHOW_KDS (status: 1/0, value: '1'/'0').
    """
    try:
        return MongoDBService.toggle_kds_master_status(
            payload=payload,
            current_user=current_user,
            db=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi đổi trạng thái SHOW_KDS ({payload.host}): {str(e)}"
        )


def _check_is_dung_or_super_admin(user: UserInfo) -> bool:
    username = (getattr(user, "username", "") or "").lower().strip()
    is_super = getattr(user, "is_super_admin", False) or username in ["admin", "administrator", "dung.nguyenanh"]
    pq = str(getattr(user, "phanquyen", "") or "").strip()
    role_name = (getattr(user, "role_name", "") or "").lower()
    return is_super or username == "dung.nguyenanh" or pq == "0" or "super" in role_name or "supper" in role_name


@router.get("/fix-cpu/config", response_model=MongoFixCpuConfigResponse)
def get_fix_cpu_config(
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Lấy cấu hình email mặc định cho tính năng Fix Full CPU MongoDB.
    Chỉ user Super Admin hoặc dung.nguyenanh mới thấy được giá trị default_email.
    Các user khác sẽ nhận default_email = None.
    """
    is_priv = _check_is_dung_or_super_admin(current_user)
    return MongoFixCpuConfigResponse(
        default_email=mongo_fix_cpu_service.get_default_email() if is_priv else None,
        is_privileged=is_priv
    )


@router.post("/fix-cpu/config", response_model=MongoFixCpuConfigResponse)
def save_fix_cpu_config(
    payload: MongoFixCpuConfigRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Cập nhật email mặc định nhận báo cáo Fix CPU.
    Chỉ Super Admin hoặc dung.nguyenanh mới có quyền gọi.
    """
    if not _check_is_dung_or_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Super Admin hoặc dung.nguyenanh mới có quyền chỉnh sửa cấu hình email mặc định."
        )
    saved_email = mongo_fix_cpu_service.save_default_email(payload.default_email)
    return MongoFixCpuConfigResponse(
        default_email=saved_email,
        is_privileged=True
    )


@router.post("/fix-cpu/execute", response_model=MongoFixCpuResponse)
def execute_fix_cpu(
    payload: MongoFixCpuRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Thực hiện quét và tạo Index tự động giải phóng Full CPU 100% MongoDB cho danh sách nhà hàng đã chọn.
    Chỉ quét các nhà hàng có trạng thái ON hoặc NEW (bỏ qua OFF).
    Quét toàn bộ IP .11, .12, .41 trên cổng 27017.
    Tự động gửi email báo cáo tới dung.nguyenanh@ggg.com.vn và user thực hiện.
    """
    is_priv = _check_is_dung_or_super_admin(current_user)
    
    # Chỉ cho phép override default_email nếu là Super Admin / Dung
    custom_default_email = payload.default_email if is_priv else None
    
    # Xác định email người thực hiện
    user_email = payload.user_email or getattr(current_user, "email", None)
    if not user_email:
        uname = getattr(current_user, "username", "it.user")
        user_email = f"{uname}@ggg.com.vn"

    performer_name = getattr(current_user, "full_name", "") or getattr(current_user, "username", "IT Staff")

    try:
        res = mongo_fix_cpu_service.execute_fix_cpu(
            db=db,
            restaurant_ids=payload.restaurant_ids,
            default_email=custom_default_email,
            user_email=user_email,
            performer_name=performer_name,
            send_email=payload.send_email
        )
        if res and getattr(res, "success", False):
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="MONGO_FIX_CPU",
                hanh_dong="OPTIMIZE",
                noi_dung=f"Xử lý Full CPU MongoDB: Tối ưu index cho {getattr(res, 'scanned_count', 0)} máy trạm",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return res
    except Exception as e:
        logger.error(f"[MONGO_FIX_CPU] Lỗi khi thực thi: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thực thi Xử lý Full CPU MongoDB: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════════════════
# MONGO DATABASE TRANSFER / MIGRATE ROUTES
# ══════════════════════════════════════════════════════════════════════════

@router.post("/transfer/scan-machines", response_model=MongoScanMachinesResponse)
def scan_transfer_machines(
    payload: MongoScanMachinesRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Quét danh sách các máy POS/KDS trong mạng nhà hàng (.11, .12, .13, .14, .41, .42, v.v.)
    Kiểm tra máy nào đang mở port 27017 và chạy MongoDB.
    """
    try:
        return MongoDBService.scan_transfer_machines(db=db, payload=payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi quét danh sách máy MongoDB: {str(e)}"
        )


@router.post("/transfer/inspect-pair", response_model=MongoInspectPairResponse)
def inspect_transfer_pair(
    payload: MongoInspectPairRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    So sánh, dò tìm database giữa Máy Nguồn và Máy Đích.
    Cảnh báo nếu máy đích đã có sẵn database trùng lặp.
    Phân tích dung lượng ACTION_LOG có thể tối ưu.
    """
    try:
        return MongoDBService.inspect_transfer_pair(payload=payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi kiểm tra đối chiếu máy nguồn và máy đích: {str(e)}"
        )


@router.post("/transfer/execute", response_model=MongoTransferExecuteResponse)
def execute_transfer_databases(
    payload: MongoTransferExecuteRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Bắt đầu thực hiện quy trình chuyển database MongoDB từ máy nguồn sang máy đích:
    1. Xóa toàn bộ dữ liệu bảng ACTION_LOG của G_ORDER (và ACTION_LOG_BK) để giảm dung lượng.
    2. Xóa các database cũ trùng tên trên máy đích.
    3. Sao chép toàn bộ collections và indexes sang máy mới.
    4. Đối soát số lượng bản ghi và ghi Audit Log.
    """
    try:
        user_name = getattr(current_user, "username", "IT_Staff")
        return MongoDBService.execute_transfer(
            payload=payload,
            current_user_name=user_name,
            db_session=db
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi chuyển database: {str(e)}"
        )


@router.get("/transfer/settings", response_model=MongoTransferSettingsResponse)
def get_transfer_settings(
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Lấy danh sách đuôi IP mặc định khi quét chuyển DB"""
    return MongoTransferSettingsResponse(default_tails=get_transfer_default_tails())


@router.post("/transfer/settings", response_model=MongoTransferSettingsResponse)
def update_transfer_settings(
    payload: MongoTransferSettingsUpdateRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Cập nhật danh sách đuôi IP mặc định khi quét chuyển DB cho tất cả nhà hàng sau này"""
    updated = save_transfer_default_tails(payload.default_tails)
    return MongoTransferSettingsResponse(default_tails=updated)


# ══════════════════════════════════════════════════════════════════════════════
# TÁC VỤ 3: QUẢN LÝ THỰC ĐƠN SO / CO (MENU_SO_CO)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/menu-so-co/menus", response_model=MenuCategoriesResponse)
def get_menu_so_co_categories(
    host: str = Query(..., description="IP máy trạm MongoDB nhà hàng"),
    port: int = Query(27017, description="Cổng kết nối MongoDB"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Lấy danh sách các Menu trong nhà hàng kèm số lượng nhóm & món ăn"""
    try:
        menus = mongo_menu_so_co_service.get_menu_categories(host=host, port=port)
        return MenuCategoriesResponse(
            host=host,
            menus=menus,
            total_menus=len(menus)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải danh sách Menu: {str(e)}"
        )


@router.get("/menu-so-co/lookup-dish", response_model=DishLookupResponse)
def lookup_dish(
    host: str = Query(..., description="IP máy trạm MongoDB nhà hàng"),
    rk7_code: str = Query(..., description="Mã món RK7 cần tra cứu"),
    port: int = Query(27017, description="Port MongoDB"),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Tra cứu thông tin Tên món, Mã SAP, Đơn giá và Hình ảnh theo Mã RK7:
    Ưu tiên quét từ MongoDB GPOS tại nhà hàng (DISH_CACHE, CO_MENU_ITEM, ORDER_MENU_CACHE_CATEGORY),
    nếu không có sẽ đối soát từ CSDL Master RK7 tập trung.
    """
    try:
        res = mongo_menu_so_co_service.lookup_dish_info(host=host, rk7_code=rk7_code, port=port)
        return DishLookupResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tra cứu thông tin món ăn: {str(e)}"
        )


@router.post("/menu-so-co/load-items", response_model=LoadMenuItemsResponse)
def load_menu_so_co_items(
    payload: LoadMenuItemsRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Tải chi tiết món ăn trong Menu, đối chiếu SO và CO, hỗ trợ tìm kiếm"""
    try:
        res = mongo_menu_so_co_service.load_menu_items(
            host=payload.host,
            port=payload.port,
            menu_codes=payload.menu_codes,
            search_all=payload.search_all,
            query=payload.query,
            rk7_codes=payload.rk7_codes,
            sap_codes=payload.sap_codes,
            names=payload.names,
        )
        return LoadMenuItemsResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải danh sách món ăn Menu: {str(e)}"
        )


@router.post("/menu-so-co/check-conflicts", response_model=CheckConflictsResponse)
def check_menu_so_co_conflicts(
    payload: LoadMenuItemsRequest,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Kiểm tra xung đột: Cùng mã RK7 khác tên, hoặc cùng tên khác mã RK7"""
    try:
        res = mongo_menu_so_co_service.check_dish_conflicts(
            host=payload.host,
            port=payload.port,
            menu_codes=payload.menu_codes if not payload.search_all else None,
        )
        return CheckConflictsResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi kiểm tra xung đột món: {str(e)}"
        )


@router.post("/menu-so-co/resolve-conflict", response_model=ResolveConflictResponse)
def resolve_menu_so_co_conflict(
    payload: ResolveConflictRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Đồng bộ mã RK7 hoặc tên món bị sai lệch về 1 giá trị duy nhất"""
    try:
        res = mongo_menu_so_co_service.resolve_dish_conflict(
            host=payload.host,
            port=payload.port,
            conflict_type=payload.conflict_type,
            unified_rk7_code=payload.unified_rk7_code,
            unified_name=payload.unified_name,
            affected_rk7_codes=payload.affected_rk7_codes,
            affected_names=payload.affected_names,
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="UPDATE",
                noi_dung=f"Đồng bộ xung đột {payload.conflict_type} món '{payload.unified_name}' (RK7: {payload.unified_rk7_code}) trên {payload.host}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return ResolveConflictResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi đồng bộ xung đột món: {str(e)}"
        )


@router.post("/menu-so-co/activate-co", response_model=ActivateCoResponse)
def activate_dishes_to_co(
    payload: ActivateCoRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Kích hoạt 1 hoặc nhiều món sang CO (với Kalo mặc định 100)"""
    try:
        res = mongo_menu_so_co_service.activate_to_co(
            host=payload.host,
            port=payload.port,
            items=payload.items,
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="UPDATE",
                noi_dung=f"Kích hoạt {len(payload.items)} món sang CO trên {payload.host}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return ActivateCoResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi kích hoạt món sang CO: {str(e)}"
        )


@router.post("/menu-so-co/deactivate-co", response_model=DeactivateCoResponse)
def deactivate_dishes_from_co(
    payload: DeactivateCoRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Tắt kích hoạt (gỡ bỏ) 1 hoặc nhiều món khỏi CO"""
    try:
        res = mongo_menu_so_co_service.deactivate_from_co(
            host=payload.host,
            port=payload.port,
            rk7_codes=payload.rk7_codes,
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="DELETE",
                noi_dung=f"Tắt kích hoạt {len(payload.rk7_codes)} món khỏi CO trên {payload.host}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return DeactivateCoResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tắt kích hoạt món khỏi CO: {str(e)}"
        )


@router.post("/menu-so-co/bulk-add", response_model=BulkAddDishesResponse)
def bulk_add_menu_dishes(
    payload: BulkAddDishesRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Thêm hàng loạt món ăn vào Menu theo định dạng bảng tính dạng Sheets"""
    try:
        raw_items = [row.dict() for row in payload.items]
        res = mongo_menu_so_co_service.bulk_add_dishes(
            host=payload.host,
            port=payload.port,
            target_menu_codes=payload.target_menu_codes,
            group_mode=payload.group_mode,
            group_code=payload.group_code,
            group_name=payload.group_name,
            group_name_en=payload.group_name_en,
            level=payload.level,
            items=raw_items,
            menu_group_map=payload.menu_group_map,
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="INSERT",
                noi_dung=f"Thêm hàng loạt {len(payload.items)} món vào menu [{', '.join(payload.target_menu_codes)}] (Nhóm: {payload.group_name or payload.group_code}, Level: {payload.level}) trên {payload.host}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return BulkAddDishesResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thêm món hàng loạt: {str(e)}"
        )


@router.put("/menu-so-co/update-item", response_model=UpdateDishItemResponse)
def update_menu_dish_item(
    payload: UpdateDishItemRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Cập nhật chi tiết 1 món ăn: RK7, SAP, Tên món, Thứ tự, Giá, Ảnh, Level"""
    try:
        res = mongo_menu_so_co_service.update_dish_item(
            host=payload.host,
            port=payload.port,
            menu_code=payload.menu_code,
            group_code=payload.group_code,
            original_rk7_code=payload.original_rk7_code,
            new_rk7_code=payload.new_rk7_code,
            new_name=payload.new_name,
            new_sap_code=payload.new_sap_code or "",
            new_sort_order=payload.new_sort_order,
            new_price=payload.new_price,
            new_image_url=payload.new_image_url or "",
            new_level=payload.new_level,
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="UPDATE",
                noi_dung=f"Cập nhật món '{payload.new_name}' (RK7: {payload.new_rk7_code}, SAP: {payload.new_sap_code or '-'}, Giá: {payload.new_price}) trong Menu {payload.menu_code} trên {payload.host}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return UpdateDishItemResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi cập nhật món: {str(e)}"
        )


@router.post("/menu-so-co/delete-items", response_model=DeleteDishesResponse)
def delete_menu_dish_items(
    payload: DeleteDishesRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Xóa hàng loạt món ăn khỏi Menu đã chọn hoặc khỏi tất cả Menu"""
    try:
        res = mongo_menu_so_co_service.delete_dishes(
            host=payload.host,
            port=payload.port,
            items=payload.items,
            delete_from_all_menus=payload.delete_from_all_menus,
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="DELETE",
                noi_dung=f"Xóa {len(payload.items)} món khỏi thực đơn ({'Tất cả menu' if payload.delete_from_all_menus else 'Menu chọn'}) trên {payload.host}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return DeleteDishesResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa món: {str(e)}"
        )


@router.post("/menu-so-co/move-clone-items", response_model=MoveCloneDishesResponse)
def move_or_clone_menu_dish_items(
    payload: MoveCloneDishesRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Chuyển (move) hoặc nhân bản (clone) món ăn sang Nhóm khác / Menu khác"""
    try:
        res = mongo_menu_so_co_service.move_or_clone_dishes(
            host=payload.host,
            port=payload.port,
            action=payload.action,
            source_items=payload.source_items,
            target_menu_code=payload.target_menu_code,
            target_group_code=payload.target_group_code,
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="UPDATE",
                noi_dung=f"{'Nhân bản' if payload.action == 'clone' else 'Di chuyển'} {len(payload.source_items)} món sang menu {payload.target_menu_code} (nhóm {payload.target_group_code}) trên {payload.host}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return MoveCloneDishesResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi chuyển/nhân bản món: {str(e)}"
        )


@router.post("/menu-so-co/sync-all", response_model=SyncAllSoCoResponse)
def sync_all_so_co(
    payload: SyncAllSoCoRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Đồng bộ toàn bộ SO và CO:
    - Tăng VERSION_MENU_SO, cập nhật giá/tên món vào SO
    - Đồng bộ thời gian chế biến món sang KDS (G_KITCHEN.CONFIG_COOKING)
    - Tăng VERSION_MENU_CO & VERSION_MENU_CONFIG, làm mới cache CO
    - Ghi nhận đầy đủ log đồng bộ
    """
    try:
        res = mongo_menu_so_co_service.sync_all_so_co(
            host=payload.host,
            port=payload.port,
            restaurant_code=payload.restaurant_code or "",
            username=current_user.username or "admin",
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SO_CO",
                hanh_dong="SYNC",
                noi_dung=f"Đồng bộ toàn bộ SO ➔ CO (Mã NH: {payload.restaurant_code or '-'}) trên máy {payload.host}: {res.get('message')}",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return SyncAllSoCoResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi đồng bộ toàn bộ SO/CO: {str(e)}"
        )


@router.post("/menu-so-co/snapshots/save", response_model=SaveMenuSnapshotResponse)
def save_menu_snapshot(
    payload: SaveMenuSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Lưu snapshot cấu trúc thực đơn vào Không Gian Trung Gian"""
    try:
        res = mongo_menu_so_co_service.save_menu_snapshot(
            host=payload.host,
            port=payload.port,
            source_sap=payload.source_sap,
            source_name=payload.source_name,
            snapshot_name=payload.snapshot_name,
            menu_codes=payload.menu_codes,
            username=current_user.username or "admin",
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SNAPSHOT",
                hanh_dong="INSERT",
                noi_dung=f"Lưu snapshot thực đơn '{payload.snapshot_name}' ({payload.source_sap}) vào Không Gian Trung Gian",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return SaveMenuSnapshotResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lưu snapshot thực đơn: {str(e)}"
        )


@router.get("/menu-so-co/snapshots")
def list_menu_snapshots(
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Danh sách các snapshot thực đơn trong Không Gian Trung Gian"""
    try:
        return mongo_menu_so_co_service.list_menu_snapshots()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi lấy danh sách snapshot: {str(e)}"
        )


@router.get("/menu-so-co/snapshots/{snapshot_id}")
def get_menu_snapshot_detail(
    snapshot_id: str,
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Xem chi tiết 1 snapshot trong Không Gian Trung Gian"""
    try:
        return mongo_menu_so_co_service.get_menu_snapshot_detail(snapshot_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lỗi khi lấy chi tiết snapshot: {str(e)}"
        )


@router.delete("/menu-so-co/snapshots/{snapshot_id}")
def delete_menu_snapshot(
    snapshot_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Xóa 1 snapshot khỏi Không Gian Trung Gian"""
    try:
        success = mongo_menu_so_co_service.delete_menu_snapshot(snapshot_id)
        if success:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SNAPSHOT",
                hanh_dong="DELETE",
                noi_dung=f"Xóa snapshot '{snapshot_id}' khỏi Không Gian Trung Gian",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return {"success": success, "message": "Đã xóa snapshot thành công!" if success else "Không tìm thấy snapshot"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi xóa snapshot: {str(e)}"
        )


@router.post("/menu-so-co/snapshots/{snapshot_id}/deploy", response_model=DeployMenuSnapshotResponse)
def deploy_menu_snapshot(
    snapshot_id: str,
    payload: DeployMenuSnapshotRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Triển khai snapshot thực đơn từ Không Gian Trung Gian sang Nhà Hàng Đích"""
    try:
        res = mongo_menu_so_co_service.deploy_menu_snapshot(
            snapshot_id=snapshot_id,
            target_host=payload.target_host,
            target_port=payload.target_port,
            target_sap=payload.target_sap,
            mode=payload.mode,
            target_menu_codes=payload.target_menu_codes,
            sync_co=payload.sync_co,
            username=current_user.username or "admin",
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SNAPSHOT",
                hanh_dong="DEPLOY",
                noi_dung=f"Triển khai snapshot '{snapshot_id}' sang máy đích {payload.target_host} ({payload.target_sap}, mode: {payload.mode})",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return DeployMenuSnapshotResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi triển khai snapshot: {str(e)}"
        )


@router.post("/menu-so-co/sync-to-restaurant", response_model=DirectSyncMenuResponse)
def direct_sync_restaurant_menu(
    payload: DirectSyncMenuRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Đồng bộ menu trực tiếp từ Nhà Hàng Nguồn sang Nhà Hàng Đích"""
    try:
        res = mongo_menu_so_co_service.direct_sync_restaurant_menu(
            source_host=payload.source_host,
            source_port=payload.source_port,
            target_host=payload.target_host,
            target_port=payload.target_port,
            source_sap=payload.source_sap,
            source_name=payload.source_name,
            target_sap=payload.target_sap,
            target_name=payload.target_name,
            mode=payload.mode,
            menu_codes=payload.menu_codes,
            sync_co=payload.sync_co,
            username=current_user.username or "admin",
        )
        if res.get("success"):
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="GPOS_MENU_SYNC",
                hanh_dong="SYNC",
                noi_dung=f"Đồng bộ thực đơn trực tiếp từ {payload.source_sap} ({payload.source_host}) sang {payload.target_sap} ({payload.target_host}, mode: {payload.mode})",
                user_thuchien=current_user.username,
                current_user=current_user
            )
        return DirectSyncMenuResponse(**res)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi đồng bộ menu sang nhà hàng: {str(e)}"
        )











