module.exports = async (ctx, next) => {
    if (ctx.from && ctx.from.id.toString() !== process.env.ADMIN_TG_ID) return;
    return next();
};