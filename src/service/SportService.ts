import axios from 'axios';
import cron from 'node-cron';
import {AppDataSource} from "../config/db";
import {Match} from "../entity/Match";
import {Strategy} from "../entity/Strategy";


interface Event {
    C: number; // Koef
    G: number; // Guruh
    T: number; // Tikish turi
    P?: number; // Total qiymati
}

interface FullScore {
    S1?: number;
    S2?: number;
}

interface Game {
    DI: number;
    I: number;
    O1: string;
    O1I: number;
    O2: string;
    O2I: number;
    S: number;
    E: Event[];
    SC?: {
        FS?: FullScore;
    };
}


export const get_fifa18 = async (): Promise<any> => {  // Promise<any[]> qaytarish
    try {
        const res = await axios.get("https://1xliteuz.com/service-api/LiveFeed/Web/Cyber/GetGamesV2?sport=85&champs=1939256&type=1&country=192&gr=974&whence=55");

        const games: Game[] = res.data?.Value?.[0]?.G || [];
        const now = Math.floor(Date.now() / 1000);

        const gameList = games
            .map(g => {
                const p1 = g.E.find(e => e.T === 1 && e.G === 1)?.C || null;
                const p2 = g.E.find(e => e.T === 3 && e.G === 1)?.C || null;

                const totalOver = g.E.find(e => e.T === 10 && e.G === 17);
                const totalUnder = g.E.find(e => e.T === 9 && e.G === 17);

                const status = g.S > now ? "Kutilmoqda" : "Boshlangan";

                const result = (g.SC?.FS?.S1 ?? 0) !== 0 || (g.SC?.FS?.S2 ?? 0) !== 0
                    ? `${g.SC?.FS?.S1 ?? 0} - ${g.SC?.FS?.S2 ?? 0}`
                    : "-";
                return {
                    game_number: g.DI,
                    match_id: g.I,
                    team1: g.O1,
                    team1_id: g.O1I,
                    team2: g.O2,
                    team2_id: g.O2I,
                    start_time: new Date(g.S * 1000).toISOString(),
                    status,
                    result,
                    p1_koeff: p1,
                    p2_koeff: p2,
                    total_over: totalOver ? {
                        value: totalOver.P,
                        koeff: totalOver.C
                    } : null,
                    total_under: totalUnder ? {
                        value: totalUnder.P,
                        koeff: totalUnder.C
                    } : null
                };
            })
            // Faqat boshlangan o'yinlarni filtrlaymiz
            .filter(game => game.status === "Boshlangan");

        return gameList[0]; // Faol o'yinlar ro'yxatini qaytarish

    } catch (error) {
        console.error("❌ Xatolik yuz berdi:", error);
        return {};  // Xatolik bo'lsa bo'sh ro'yxat qaytariladi
    }
};

export const get_fifa_last = async (): Promise<any> => {
    try {
        const res = await axios.get("https://1xliteuz.com/service-api/LiveFeed/Web/Cyber/GetGamesV2?sport=85&champs=1939256&type=1&country=192&gr=974&whence=55");

        const games: Game[] = res.data?.Value?.[0]?.G || [];
        const now = Math.floor(Date.now() / 1000);

        const gameList = games
            .map(g => {
                const p1 = g.E.find(e => e.T === 1 && e.G === 1)?.C || null;
                const p2 = g.E.find(e => e.T === 3 && e.G === 1)?.C || null;

                const totalOver = g.E.find(e => e.T === 10 && e.G === 17);
                const totalUnder = g.E.find(e => e.T === 9 && e.G === 17);

                const status = g.S > now ? "Kutilmoqda" : "Boshlangan";

                const result = (g.SC?.FS?.S1 ?? 0) !== 0 || (g.SC?.FS?.S2 ?? 0) !== 0
                    ? `${g.SC?.FS?.S1 ?? 0} - ${g.SC?.FS?.S2 ?? 0}`
                    : "-";

                return {
                    game_number: g.DI,
                    match_id: g.I,
                    team1: g.O1,
                    team1_id: g.O1I,
                    team2: g.O2,
                    team2_id: g.O2I,
                    start_time: new Date(g.S * 1000).toISOString(),
                    status,
                    result,
                    p1_koeff: p1,
                    p2_koeff: p2,
                    total_over: totalOver ? {
                        value: totalOver.P,
                        koeff: totalOver.C
                    } : null,
                    total_under: totalUnder ? {
                        value: totalUnder.P,
                        koeff: totalUnder.C
                    } : null
                };
            })
            // Faqat boshlanishi kutilayotgan o'yinlarni filtrlaymiz
            .filter(game => game.status === "Kutilmoqda")
            // Kutilayotgan o'yinlarni boshlanish vaqtiga qarab tartiblash
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        // Eng yaqin boshlanadigan o'yinni olish
        return gameList[0] || {}; // Agar o'yin bo'lsa, uni qaytarish, bo'lmasa bo'sh obyekt
    } catch (error) {
        console.error("❌ Xatolik yuz berdi:", error);
        return {};  // Xatolik bo'lsa bo'sh ro'yxat qaytariladi
    }
};

const matchRepository = AppDataSource.getRepository(Match);
const strategyRepository = AppDataSource.getRepository(Strategy);


// Bu funksiyani har 3 soniyada ishga tushiramiz
cron.schedule('*/2 * * * * *', async () => {
    try {
        const fifa = await get_fifa18(); // FIFA o'yinlarini olish
        if (fifa) {
            // Bazadagi o'yinlarni match_id lar bo'yicha olish
            const game = await matchRepository.findOne({where: {match_id: fifa.match_id}});

            if (game) {
                // O'yin natijalarini tekshirish va yangilash
                if (String(game.result) !== String(fifa.result) && String(fifa.result) !== '-') {
                    const message = `
#N${game.game_number} <b>${game.team1}</b> <b>(${fifa.result})</b> <b>${game.team2}</b>
    \n<b>П1</b>: ${game.p1_koeff} | <b>П2</b>: ${game.p2_koeff}
    \n<b>Т/б</b> ${game.total_over.value} :  ${game.total_over.koeff} | <b>Т/м</b>${game.total_under.value} :  ${game.total_under.koeff}\n\n<b>Update time: ${getTime(new Date())}</b>
  `;

                    // Telegramga xabar yuborish va message_id qaytarish
                    const message_id = await sendTg('@fifa_18_analiz', message, '7609032453:AAGJ1c1bQLV9ZS5VBqYOUS4iwwcSOkXNCLs', game.message_id);

                    if (message_id) {
                        game.message_id = message_id; // Yangi message_id saqlash
                        await matchRepository.save(game); // O'yin ma'lumotlarini yangilash
                    }

                    if (String(fifa.result) !== '-') {
                        game.result = fifa.result; // Agar natija mavjud bo'lsa, yangilash
                        await matchRepository.save(game); // Natija va statusni saqlash

                    }
                }
            } else {
                // Yangi o'yinlarni bazaga saqlash
                const newMatch = new Match();
                newMatch.game_number = fifa.game_number;
                newMatch.match_id = fifa.match_id;
                newMatch.team1 = fifa.team1;
                newMatch.team1_id = fifa.team1_id;
                newMatch.team2 = fifa.team2;
                newMatch.team2_id = fifa.team2_id;
                newMatch.start_time = new Date(fifa.start_time);
                newMatch.status = fifa.status;
                newMatch.result = fifa.result;
                newMatch.p1_koeff = fifa.p1_koeff;
                newMatch.p2_koeff = fifa.p2_koeff;
                newMatch.total_over = fifa.total_over;
                newMatch.total_under = fifa.total_under;

                // Yangi o'yinlarni bazaga saqlash
                await matchRepository.save(newMatch);
            }
        }

    } catch (error) {
        console.error("❌ Xatolik yuz berdi:", error);
    }
});
cron.schedule('*/10 * * * * *', async () => {

    try {


        //agar live bo'lsa signal bermaymiz
        const fifa = await get_fifa18()
        if (fifa) return;


        // Oxirgi 14 ta o'yinni olish
        const last14Matches = await matchRepository.find({
            order: {id: "DESC"}, // Id bo'yicha teskari tartibda, eng yangi o'yinlar
            take: 14,
        });

        // FAQAT QAYSI JAMO YUTISHINI ANALIZ QILADI
        await teamAnalise(last14Matches);

        await totalAnise(last14Matches);
        await fovoritAnise(last14Matches);


    } catch (error) {
        console.error("Xatolik yuz berdi:", error);
    }


});

const teamAnalise = async (last14Matches: any): Promise<any> => {

    let team1Wins = 0;
    let team2Wins = 0;
    let totalMatches = 0; // Jami o'yinlar soni
    let lastWinner = null; // So'nggi g'olibni saqlash uchun

    // O'yinlar bo'yicha ketma-ket g'alabalarni hisoblash
    for (let i = last14Matches.length - 1; i >= 0; i--) {
        const match = last14Matches[i];
        const resultArray = match.result.split(' - ').map(Number);

        if (resultArray.length === 2) {
            const [team1Score, team2Score] = resultArray;

            // Durrang holatini tekshirish
            if (team1Score === team2Score) {
                team1Wins = 0;  // Team1 uchun g'alabalar to'xtatiladi
                team2Wins = 0;  // Team2 uchun g'alabalar to'xtatiladi
                continue;  // Durrang bo'lsa, bu o'yinni o'tkazib yuborish
            }

            // Team1 g'alabasi
            if (team1Score > team2Score) {
                if (lastWinner === 'Team1') {
                    team1Wins++;
                } else {
                    team1Wins = 1;
                    lastWinner = 'Team1';
                }
                team2Wins = 0; // Agar Team1 g'olib bo'lsa, Team2 ketma-ket g'alabalarini tozalash
            } else if (team2Score > team1Score) {
                if (lastWinner === 'Team2') {
                    team2Wins++;
                } else {
                    team2Wins = 1;
                    lastWinner = 'Team2';
                }
                team1Wins = 0; // Agar Team2 g'olib bo'lsa, Team1 ketma-ket g'alabalarini tozalash
            }

            totalMatches++; // O'yinlar sonini hisoblash
        }
    }

    let signal = false
    let old_win_team = ''
    let win_team = ''
    let win_count
    let win_percentage
    if (team1Wins >= 5) {
        old_win_team = 'П1'
        win_team = 'П2'
        signal = true
        win_count = team1Wins
        win_percentage = Math.min(100, (team1Wins / totalMatches) * 100).toFixed(2)
    } else if (team2Wins >= 5) {
        signal = true
        old_win_team = 'П2'
        win_team = 'П1'
        win_count = team2Wins
        win_percentage = Math.min(100, (team2Wins / totalMatches) * 100).toFixed(2)
    }


    if (signal) {

        const lastFifa = await get_fifa_last();

        let strategy = await strategyRepository.findOne({where: {match_id: lastFifa.match_id}});

        if (!strategy) {
            const new_strategy = new Strategy();
            new_strategy.game_number = lastFifa.game_number;
            new_strategy.match_id = lastFifa.match_id;
            new_strategy.team1 = lastFifa.team1;
            new_strategy.team1_id = lastFifa.team1_id;
            new_strategy.team2 = lastFifa.team2;
            new_strategy.team2_id = lastFifa.team2_id;
            new_strategy.start_time = new Date(lastFifa.start_time);
            new_strategy.status = lastFifa.status;
            new_strategy.result = lastFifa.result;
            new_strategy.p1_koeff = lastFifa.p1_koeff;
            new_strategy.p2_koeff = lastFifa.p2_koeff;
            new_strategy.total_over = lastFifa.total_over;
            new_strategy.total_under = lastFifa.total_under;
            strategy = await strategyRepository.save(new_strategy);
        }

        const text = `📢 **Хушхабар!** 🚨

🎯 ${old_win_team} кетма-кет ${win_count} та ғалаба қўзонди! 🎉

🔥 Эндi ${win_team} ғалабасининг эҳтимоли <b>${win_percentage}</b>%! 💥


#N${lastFifa.game_number} <b>${lastFifa.team1}</b> <b>( - )</b> <b>${lastFifa.team2}</b>
    \n<b>П1</b>: ${lastFifa.p1_koeff} | <b>П2</b>: ${lastFifa.p2_koeff}
    \n<b>Т/б</b> ${lastFifa.total_over.value} :  ${lastFifa.total_over.koeff} | <b>Т/м</b>${lastFifa.total_under.value} :  ${lastFifa.total_under.koeff}\n\n<b>Update time: ${getTime(new Date())}</b>
 
`

        if (!strategy.message_id) {
            const message_id = await sendTg('@fifa_18_analiz', text, '7609032453:AAGJ1c1bQLV9ZS5VBqYOUS4iwwcSOkXNCLs', undefined);
            await sendTg('@sport_uz_yagonabet', text, '7609032453:AAGJ1c1bQLV9ZS5VBqYOUS4iwwcSOkXNCLs', undefined);
            if (message_id) {
                strategy.message_id = message_id
                await strategyRepository.save(strategy)
            }
        }

    }
}

const totalAnise = async (last14Matches: any): Promise<void> => {
    let currentStreakType: 'over' | 'under' | null = null;
    let streakCount = 0;

    for (let i = 0; i < last14Matches.length; i++) {
        const match = last14Matches[i];
        const resultArray = match.result?.split(' - ').map(Number);
        if (!resultArray || resultArray.length !== 2) continue;

        const [team1Score, team2Score] = resultArray;
        const total = team1Score + team2Score;

        const matchType = total > 5.5 ? 'over' : 'under';

        if (currentStreakType === null || currentStreakType === matchType) {
            currentStreakType = matchType;
            streakCount++;
        } else {
            break;
        }
    }

    if (streakCount >= 5) {
        const lastFifa = await get_fifa_last();
        if (!lastFifa) return;

        let strategy = await strategyRepository.findOne({ where: { match_id: lastFifa.match_id } });

        if (!strategy) {
            const new_strategy = new Strategy();
            new_strategy.game_number = lastFifa.game_number;
            new_strategy.match_id = lastFifa.match_id;
            new_strategy.team1 = lastFifa.team1;
            new_strategy.team1_id = lastFifa.team1_id;
            new_strategy.team2 = lastFifa.team2;
            new_strategy.team2_id = lastFifa.team2_id;
            new_strategy.start_time = new Date(lastFifa.start_time);
            new_strategy.status = lastFifa.status;
            new_strategy.result = lastFifa.result;
            new_strategy.p1_koeff = lastFifa.p1_koeff;
            new_strategy.p2_koeff = lastFifa.p2_koeff;
            new_strategy.total_over = lastFifa.total_over;
            new_strategy.total_under = lastFifa.total_under;
            strategy = await strategyRepository.save(new_strategy);
        }

        const icon = currentStreakType === 'under' ? '🟩' : '🟥';
        const prev = currentStreakType === 'under' ? 'Т/М 5,5 ⬇️' : 'Т/Б 5,5 ⬆️';
        const next = currentStreakType === 'under' ? 'Т/Б 5,5 ⬆️' : 'Т/М 5,5 ⬇️';

        const text = `📢 <b>На тотал стратегия ⚽️</b>

${icon} Вряд ${streakCount} игры было ${prev}

➡️ Дагон на ${next}

#N${lastFifa.game_number} <b>${lastFifa.team1}</b> <b>( - )</b> <b>${lastFifa.team2}</b>
<b>П1</b>: ${lastFifa.p1_koeff} | <b>П2</b>: ${lastFifa.p2_koeff}
<b>Т/б:</b> ${lastFifa.total_over.value} - ${lastFifa.total_over.koeff} | <b>Т/м:</b> ${lastFifa.total_under.value} - ${lastFifa.total_under.koeff}
<b>Update time:</b> ${getTime(new Date())}`;

        if (!strategy.message_id) {
            const message_id = await sendTg('@fifa_18_analiz', text, '7609032453:AAGJ1c1bQLV9ZS5VBqYOUS4iwwcSOkXNCLs', undefined);
            await sendTg('@sport_uz_yagonabet', text, '7609032453:AAGJ1c1bQLV9ZS5VBqYOUS4iwwcSOkXNCLs', undefined);

            if (message_id) {
                strategy.message_id = message_id;
                await strategyRepository.save(strategy);
            }
        }
    }
};

const fovoritAnise = async (last14Matches: any): Promise<void> => {
    let streakCount = 0;

    for (let i = 0; i < last14Matches.length; i++) {
        const match = last14Matches[i];
        const resultArray = match.result?.trim().split(' - ').map(Number);
        if (!resultArray || resultArray.length !== 2) continue;

        const [team1Score, team2Score] = resultArray;
        const { p1_koeff, p2_koeff } = match;

        // 1. Favorit aniqlash
        const favorite = p1_koeff < p2_koeff ? 'team1' : 'team2';

        // 2. G‘olib aniqlash
        const winner =
            team1Score === team2Score ? 'draw' :
                team1Score > team2Score ? 'team1' : 'team2';

        // 3. Durang bo‘lsa — ketma-ketlik to‘xtaydi
        if (winner === 'draw') break;

        // 4. Favorit yutdimi?
        const isFavoriteWon = favorite === winner;

        if (!isFavoriteWon) {
            streakCount++;
        } else {
            break; // favorit yutib qo‘ydi – streak tugadi
        }
    }

    // 5. Agar 5 ta ketma-ket favorit yutqazgan bo‘lsa – signal
    if (streakCount >= 5) {
        const lastFifa = await get_fifa_last();
        if (!lastFifa) return;

        const outsider = lastFifa.p1_koeff > lastFifa.p2_koeff ? 'П1' : 'П2';

        const text = `📢 <b>Стратегия на Фаворит🧠</b>

❌ Фаворит вряд ${streakCount} раз проиграл 😔

➡️ ${streakCount + 1} игры Дагоном на победу Фоворита👉 <b>${outsider}</b>

#N${lastFifa.game_number} <b>${lastFifa.team1}</b> <b>( - )</b> <b>${lastFifa.team2}</b>
<b>П1</b>: ${lastFifa.p1_koeff} | <b>П2</b>: ${lastFifa.p2_koeff}
<b>Update:</b> ${getTime(new Date())}`

        // Strategy bazasiga yozish
        let strategy = await strategyRepository.findOne({ where: { match_id: lastFifa.match_id } });

        if (!strategy) {
            const new_strategy = new Strategy();
            new_strategy.game_number = lastFifa.game_number;
            new_strategy.match_id = lastFifa.match_id;
            new_strategy.team1 = lastFifa.team1;
            new_strategy.team1_id = lastFifa.team1_id;
            new_strategy.team2 = lastFifa.team2;
            new_strategy.team2_id = lastFifa.team2_id;
            new_strategy.start_time = new Date(lastFifa.start_time);
            new_strategy.status = lastFifa.status;
            new_strategy.result = lastFifa.result;
            new_strategy.p1_koeff = lastFifa.p1_koeff;
            new_strategy.p2_koeff = lastFifa.p2_koeff;
            new_strategy.total_over = lastFifa.total_over;
            new_strategy.total_under = lastFifa.total_under;
            strategy = await strategyRepository.save(new_strategy);
        }

        // Telegramga signal yuborish
        if (!strategy.message_id) {
            const message_id = await sendTg('@fifa_18_analiz', text, "7609032453:AAGJ1c1bQLV9ZS5VBqYOUS4iwwcSOkXNCLs", undefined);
            await sendTg('@sport_uz_yagonabet', text, "7609032453:AAGJ1c1bQLV9ZS5VBqYOUS4iwwcSOkXNCLs", undefined);

            if (message_id) {
                strategy.message_id = message_id;
                await strategyRepository.save(strategy);
            }
        }
    }
}


const sendTg = async (chatId: string, message: string, token: string, messageId?: number): Promise<number | null> => {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const updateUrl = `https://api.telegram.org/bot${token}/editMessageText`;

    try {
        // Agar message_id berilgan bo'lsa, eski xabarni yangilash
        if (messageId) {
            // Xabarni yangilash
            const response = await axios.post(updateUrl, {
                chat_id: chatId,      // Kanal chat_id sini qo'shish
                message_id: messageId, // O'zgartirilgan xabarning message_id sini qo'shish
                text: message,         // Yangilangan xabar matni
                parse_mode: 'HTML',    // HTML formatda yuborish
            });

            console.log('Xabar yangilandi:', response.data);
            return response.data.result.message_id;  // Yangilangan xabarning message_id sini qaytarish
        } else {
            // Yangi xabar yuborish
            const response = await axios.post(url, {
                chat_id: chatId,     // Kanal chat_id sini qo'shish
                text: message,       // Yuboriladigan xabar
                parse_mode: 'HTML',  // HTML formatda yuborish
            });

            return response.data.result.message_id;  // Yangi xabarning message_id sini qaytarish
        }
    } catch (error) {
        if (messageId) {
            console.error('Xabarni yangilashda xatolik:', error);
        } else {
            console.error('Xabar yuborishda xatolik:', error);
        }
        return null;  // Xatolik bo'lsa null qaytarish
    }
};
const getTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0'); // Soatni olish va 2 ta raqamga keltirish
    const minutes = date.getMinutes().toString().padStart(2, '0'); // Daqiqani olish va 2 ta raqamga keltirish
    const seconds = date.getSeconds().toString().padStart(2, '0'); // Sekundni olish va 2 ta raqamga keltirish
    return `${hours}:${minutes}:${seconds}`; // Soat:daqiqani:sekundni qaytarish
};