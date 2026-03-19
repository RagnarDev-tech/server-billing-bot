const { Markup } = require('telegraf');

exports.paymentKeyboard = (serverId) => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('Оплачено', `pay_${serverId}`)],
        [Markup.button.callback('Нагадати згодом', `snooze_prompt_${serverId}`)]
    ]);
};

exports.snoozeOptionsKeyboard = (serverId, hasIp) => {
    if (hasIp) {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('1 год', `snooze_set_${serverId}_1`),
                Markup.button.callback('3 год', `snooze_set_${serverId}_3`),
                Markup.button.callback('6 год', `snooze_set_${serverId}_6`)
            ],
            [
                Markup.button.callback('12 год', `snooze_set_${serverId}_12`),
                Markup.button.callback('24 год', `snooze_set_${serverId}_24`)
            ],
            [Markup.button.callback('Відміна', `cancel_${serverId}`)]
        ]);
    } else {
        return Markup.inlineKeyboard([
            [
                Markup.button.callback('1 день', `snooze_set_${serverId}_24`),
                Markup.button.callback('2 дні', `snooze_set_${serverId}_48`),
                Markup.button.callback('3 дні', `snooze_set_${serverId}_72`)
            ],
            [
                Markup.button.callback('5 днів', `snooze_set_${serverId}_120`),
                Markup.button.callback('7 днів', `snooze_set_${serverId}_168`)
            ],
            [Markup.button.callback('Відміна', `cancel_${serverId}`)]
        ]);
    }
};

exports.confirmPaymentKeyboard = (serverId) => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('Точно оплачено?', `confirm_pay_${serverId}`)],
        [Markup.button.callback('Відміна', `cancel_${serverId}`)]
    ]);
};