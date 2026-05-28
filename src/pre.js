const user_print = Module["print"];
const user_printErr = Module["printErr"];

Module["print"] = (s) => {
  if (user_print) user_print(s);
};
Module["printErr"] = (s) => {
  if (user_printErr) user_printErr(s);
};
