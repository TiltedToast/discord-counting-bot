import winston, { config, createLogger, format, transports } from "winston";

export const myTransports = {
    console: new transports.Console(),
    file: new transports.File({ filename: "discord-counter.log" }),
};

const logger = createLogger({
    levels: config.syslog.levels,
    transports: [myTransports.console, myTransports.file],
    format: format.combine(
        format.colorize(),
        format.timestamp({
            format: "DD/MM/YYYY HH:mm:ss",
        }),
        format.align(),
        format.prettyPrint(),
        format.printf((info) => `${info["timestamp"]} ${info.level} ${info.message}`)
    ),
    exitOnError: false,
});

const customColours = {
    info: "green",
    debug: "yellow",
    warn: "orange",
    error: "red",
};
winston.addColors(customColours);

export default logger;
