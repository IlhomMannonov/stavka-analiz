import {Markup, Telegraf} from 'telegraf';
import {Request, Response} from 'express';
import {AppDataSource} from "../config/db";
import {User} from "../entity/User";
import {Context} from "node:vm";

const bot = new Telegraf('7497360325:AAGKdUMQfqB6Npi_rzxkwEBxPXwHGICCxbw');
const userRepository = AppDataSource.getRepository(User);

bot.start(async (ctx) => {
    const user = await getBotUser(ctx.chat.id.toString());
    if (!user.last_name) {
        await ctx.reply(
            'Assalomu Alaykum Iltimos telefon raqamingizni yuboring',
            Markup.keyboard([
                Markup.button.contactRequest("📞 Telefon raqamni jo'narish")
            ])
                .resize()
        );
    }

});


bot.on('contact', async (ctx) => {
    const user = await getBotUser(ctx.chat.id.toString());
    // if (user.state == 'send_phone') {
    user.state = "send_FIO";

    const contact = ctx.message.contact;
    let number = contact.phone_number;
    if (!contact.phone_number.startsWith('+')) {
        number = '+' + contact.phone_number;
    }
    user.phone_number = number;
    await userRepository.save(user);
    await ctx.reply("To'liq ism familyangizni yuboring", Markup.removeKeyboard());
    // }
});


bot.on("text", async (ctx) => {
    const user = await getBotUser(ctx.chat.id.toString());
    if (user.state === 'send_FIO') {
        const text = ctx.message.text.trim();
        const parts = text.split(' ');

        if (parts.length === 2 && parts[0].length > 3 && parts[1].length > 3) {
            const firstName = parts[0];
            const lastName = parts[1];


            user.first_name = firstName;
            user.last_name = lastName;
            await userRepository.save(user);
            // Tekshiruv muvaffaqiyatli
            await userHome(ctx);
            // Yangi holatga o'tkazish yoki boshqa amallarni bajarish
            await updateUserState(ctx.chat.id.toString(), 'user_home');
        } else {
            // Tekshiruv muvaffaqiyatsiz
            ctx.reply('Iltimos, ismingiz va familiyangizni to\'g\'ri kiriting. Ikkalasi ham kamida 3 harfdan iborat bo\'lishi kerak.');
        }
    }
})
export const userHome = async (ctx: Context) => {
    // const user = await getBotUser(ctx.chat.id.toString());
    // const payme = await paymeRepository.findOne({where: {user_id: user.id}})
    await ctx.reply(
        "All Pay Botimizga hush kelibsiz. Barcha to'lovlar bu yerda",
        Markup.inlineKeyboard([
            [Markup.button.webApp("💳 To'lovlar 💳", 'https://payme.uz/')],
        ])
    );
    await ctx.reply("👆 Bu to'lov tizimlari orqali to'lov qilishingiz uchun avval to'lov accountlarinigzni faollashtiring", Markup.removeKeyboard())
};
export const getBotUser = async (chat_id: string): Promise<User> => {
    const findUser = await userRepository.findOne({where: {chat_id}});
    if (!findUser) {
        const newUser = userRepository.create({
            chat_id,
            is_bot_user: true,
            state: 'send_phone'
        });
        // Yaratilgan foydalanuvchini saqlash
        await userRepository.save(newUser);
        return newUser;
    }
    return findUser;
};
export const updateUserState = async (chat_id: string, state: string): Promise<User> => {
    const user = await getBotUser(chat_id);
    user.state = state;
    await userRepository.save(user);
    return user;
};

export const setWebhook = (req: Request, res: Response) => {
    bot.handleUpdate(req.body);
    res.sendStatus(200);
};


export const launchBot = () => {
    bot.launch();
    console.log('Telegram bot started');
};
console.log('Bot is running...');


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
