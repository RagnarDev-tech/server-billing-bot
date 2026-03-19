const { Markup } = require('telegraf');

exports.mainMenu = Markup.keyboard([
    ['🖥 Сервери', '💰 Фінанси'],
    ['📊 Дашборд', '⚙️ Налаштування']
]).resize();