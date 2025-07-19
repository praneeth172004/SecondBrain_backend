export function random(count: number): string {
  const options = "sdfldjfslfskdjfddjflksdjfksdjff";
  let ans = "";
  for (let i = 0; i < count; i++) {
    const index = Math.floor(Math.random() * options.length);
    ans += options[index];
  }
  return ans;
}
