class InjectedChatMessage extends ChatMessage {
  static async create(data, options) {
    // Content strings of the form "#d#" for rolls appear in chat but not in macros.
    if (!isNaN(data.content)) {
      console.log("Likely coming from chat.");
      return super.create(data, options);
    }

    console.log("Data", data);
    const inJson = !((data.roll || data._roll) instanceof Roll);
    const roll = inJson ? Roll.fromJSON(data.roll) : data.roll;
    if (!(data.roll || data._roll)) {
      console.log("No roll.");
      return super.create(data, options);
    }

    return new Promise((resolve, reject) => {
      let d = new Dialog({
        title: "Edit dice roll",
        content: generateHtmlInput(getDiceFromRoll(roll)),
        buttons: {
          edit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Edit roll",
            callback: () => {
              // Generate new message here
              const formula = replaceDiceInRoll(
                roll.parts,
                getEditedValues()
              ).join(" ");
              const newRoll = new Roll(formula, roll.data).roll();
              if (inJson) {
                data._roll = newRoll;
                data.roll = newRoll.toJSON();
              } else {
                data.roll = newRoll;
              }
              resolve(super.create(data, options));
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Use random values",
            callback: () => {
              resolve(super.create(data, options));
            },
          },
        },
        default: "cancel",
        // TODO: Handle closing better than passing back undefined.
        close: () => reject(),
      });
      d.render(true);
    });
  }
}

getDiceFromRoll = (roll) => roll.parts.filter((part) => part instanceof Die);
replaceDiceInRoll = (parts, replacedDice) => {
  ix = 0;
  return parts.map((part) => {
    if (part instanceof Die) {
      const val = replacedDice[ix];
      ix++;
      return val;
    }
    return part;
  });
};
// TODO: Base min/max on die values.
generateHtmlInput = (diceToReplace) =>
  diceToReplace.map(
    (die, ix) =>
      `<p><div>${die.formula}:</div><div><input type="number" id="Die ${ix}" name="Die roll" min="1" max="1000"></div></p>`
  );

getEditedValues = () =>
  Array.from(document.getElementsByName("Die roll")).map((input) =>
    parseInt(input.value)
  );
CONFIG.ChatMessage.entityClass = InjectedChatMessage;
