const adjectives = ["Swift", "Cool", "Happy", "Sneaky", "Chill", "Brave", "Clever", "Sly", "Witty", "Fierce"];
const animals = ["Tiger", "Panda", "Falcon", "Otter", "Wolf", "Koala", "Eagle", "Fox", "Bear", "Dolphin"];

export function generateRandomName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${animal}${num}`;
}
