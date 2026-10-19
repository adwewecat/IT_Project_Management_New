from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.roles import router as roles_router
from app.api.v1.system import router as system_router
from app.api.v1.restaurants import router as restaurants_router
from app.api.v1.pim import router as pim_router
from app.api.v1.lich_truc_hotline import router as hotline_router
from app.api.v1.theodoi_pr_po_do import router as pr_po_do_router
from app.api.v1.ext_rsc import router as ext_rsc_router
from app.api.v1.code_photo import router as code_photo_router
from app.api.v1.memo import router as memo_router
from app.api.v1.projects import router as projects_router
from app.api.v1.setup_restaurants import router as setup_restaurants_router
from app.api.v1.check_mon_rk7 import router as check_mon_rk7_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.incidents import router as incidents_router
from app.api.v1.violations import router as violations_router
from app.api.v1.staff_evaluations import router as staff_evaluations_router
from app.api.v1.pm_bo import router as pm_bo_router
from app.api.v1.personal_tasks import router as personal_tasks_router
from app.api.v1.app_notifications import router as app_notifications_router
from app.api.v1.work_checklists import router as work_checklists_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.mongodb import router as mongodb_router
from app.api.v1.overnight_devices import router as overnight_devices_router
from app.api.v1.ticket_batch import router as ticket_batch_router
from app.api.v1.unassigned_3cx import router as unassigned_3cx_router
from app.api.v1.mail_memo import router as mail_memo_router
from app.api.v1.mongo_mosquitto import router as mongo_mosquitto_router
from app.api.v1.sso_management import router as sso_management_router
from app.api.v1.logs import router as logs_router
from app.api.v1.hotline import router as hotline_3cx_router
from app.api.v1.agent_multitask import router as agent_multitask_router
from app.api.v1.remote_lab import router as remote_lab_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(roles_router)
api_v1_router.include_router(system_router)
api_v1_router.include_router(restaurants_router)
api_v1_router.include_router(pim_router)
api_v1_router.include_router(hotline_router)
api_v1_router.include_router(hotline_3cx_router)
api_v1_router.include_router(pr_po_do_router)
api_v1_router.include_router(ext_rsc_router)
api_v1_router.include_router(code_photo_router)
api_v1_router.include_router(memo_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(setup_restaurants_router)
api_v1_router.include_router(check_mon_rk7_router)
api_v1_router.include_router(jobs_router)
api_v1_router.include_router(incidents_router)
api_v1_router.include_router(violations_router)
api_v1_router.include_router(staff_evaluations_router)
api_v1_router.include_router(pm_bo_router)
api_v1_router.include_router(personal_tasks_router)
api_v1_router.include_router(app_notifications_router)
api_v1_router.include_router(work_checklists_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(mongodb_router)
api_v1_router.include_router(overnight_devices_router)
api_v1_router.include_router(ticket_batch_router)
api_v1_router.include_router(unassigned_3cx_router)
api_v1_router.include_router(mail_memo_router)
api_v1_router.include_router(mongo_mosquitto_router)
api_v1_router.include_router(sso_management_router)
api_v1_router.include_router(logs_router)
api_v1_router.include_router(agent_multitask_router)
api_v1_router.include_router(remote_lab_router)






