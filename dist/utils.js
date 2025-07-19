"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = random;
function random(count) {
    const options = "sdfldjfslfskdjfddjflksdjfksdjff";
    let ans = "";
    for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * options.length);
        ans += options[index];
    }
    return ans;
}
