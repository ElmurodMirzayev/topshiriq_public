"""Telegram-бот."""
import asyncio, logging, sys
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, ContentType
from app.config import settings
from app.database.connection import SessionLocal
from app.services.auth_service import AuthService
from app.services.employee_service import EmployeeService

ROLE_LABELS = {"boshliq": "Раҳбар", "admin": "Админ", "xodim": "Ходим"}

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger(__name__)
bot = Bot(token=settings.BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📋 Ochish", web_app=WebAppInfo(url=settings.MINI_APP_URL))]
    ])
    await message.answer("👋 Хуш келибсиз!\n\nТопшириқларни бошқариш тизимига кириш учун тугмани босинг:", reply_markup=kb)

@dp.message(F.content_type == ContentType.CONTACT)
async def handle_contact(message: types.Message):
    contact = message.contact
    if not contact or not contact.phone_number:
        await message.answer("❌ Телефон рақами олинмади.")
        return
    telegram_id = message.from_user.id
    phone = contact.phone_number
    logger.info(f"Контакт: phone={phone}, tg_id={telegram_id}")
    db = SessionLocal()
    try:
        # Роль определяется автоматически по номеру телефона
        # (boshliq/admin из .env или сотрудник). Telegram ID сохраняется,
        # чтобы при следующих входах авторизация шла без запроса контакта.
        result = AuthService.bind_by_phone(
            db, phone, telegram_id,
            username=message.from_user.username,
            first_name=message.from_user.first_name,
            last_name=message.from_user.last_name,
        )
        if result:
            role, name = result
            await message.answer(
                f"✅ Муваффақиятли!\nИсм: {name}\nРоль: {ROLE_LABELS.get(role, role)}\n📋 Энди Mini App ни очинг."
            )
        else:
            await message.answer("❌ Сиз тизимда рўйхатдан ўтмагансиз.\n\nИлтимос, администратор билан боғланинг.")
    except Exception as e:
        logger.error(f"Ошибка: {e}")
        await message.answer("❌ Хатолик юз берди.")
    finally:
        db.close()

async def main():
    logger.info("🤖 Бот запускается...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
