const stdout_lines = [];
const stderr_lines = [];

Module["print"] = (s) => stdout_lines.push(s);
Module["printErr"] = (s) => stderr_lines.push(s);