/**
 * Username Generator Module
 * Generates different types of usernames for checking
 * FULLY RANDOMIZED
 */

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const CHARS = LETTERS + DIGITS;
const VOWELS = 'aeiou';
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';

function randomChoice(str) {
    return str[Math.floor(Math.random() * str.length)];
}

function randomChoices(str, k) {
    let result = '';
    for (let i = 0; i < k; i++) {
        result += randomChoice(str);
    }
    return result;
}

// Generator functions that return iterators
function* generate3C() {
    while (true) {
        yield randomChoices(CHARS, 3);
    }
}

function* generate4LVowel() {
    while (true) {
        const res = randomChoices(LETTERS, 4);
        if ([...res].some(c => VOWELS.includes(c))) {
            yield res;
        }
    }
}

function* generate4L() {
    while (true) {
        yield randomChoices(LETTERS, 4);
    }
}

function* generate4C() {
    while (true) {
        yield randomChoices(CHARS, 4);
    }
}

function* generate5L() {
    while (true) {
        yield randomChoices(LETTERS, 5);
    }
}

function* generate5C() {
    while (true) {
        yield randomChoices(CHARS, 5);
    }
}

function* generate5LMeaningful() {
    const coolPrefixes = ["x", "z", "k", "v", "q", "j", "dr", "mr", "mc", "dj", "itz", "i", "the", "real"];
    const coolSuffixes = ["x", "z", "0", "1", "9", "y", "o", "i", "69", "99", "00", "11", "ly", "ify", "ed"];
    const coolBases = [
        "ace", "pro", "god", "max", "top", "ice", "fire", "dark", "cold", "hot",
        "lit", "dope", "sick", "goat", "king", "boss", "lord", "duke", "hero",
        "zero", "neo", "rex", "lex", "jax", "zap", "zip", "zed", "zen", "vex",
        "fox", "wolf", "bear", "lion", "hawk", "owl", "bat", "cat", "dog", "rat",
        "sky", "sun", "moon", "star", "rain", "wind", "snow", "fog", "mist",
        "soul", "void", "vibe", "wave", "flow", "glow", "pure", "rare", "solo"
    ];

    const patterns = [
        // CV-CV-C
        () => randomChoice(CONSONANTS) + randomChoice(VOWELS) + randomChoice(CONSONANTS) + randomChoice(VOWELS) + randomChoice(CHARS),
        // prefix + random
        () => {
            const p = randomChoice(coolPrefixes);
            return p + randomChoices(LETTERS, 5 - p.length);
        },
        // base + suffix
        () => {
            const b = randomChoice(coolBases);
            const s = randomChoice(coolSuffixes);
            return b + s;
        },
        // 3L + suffix
        () => randomChoices(LETTERS, 3) + randomChoice(coolSuffixes),
        // Fragment + random
        () => randomChoice(["ex", "oz", "ov", "ux", "ax", "io"]) + randomChoices(LETTERS, 3),
        // Alternating
        () => randomChoice(LETTERS) + randomChoice(DIGITS) + randomChoice(LETTERS) + randomChoice(DIGITS) + randomChoice(LETTERS),
        // 4L + 1D
        () => randomChoices(LETTERS, 4) + randomChoice(DIGITS),
        // 1D + 4L
        () => randomChoice(DIGITS) + randomChoices(LETTERS, 4),
        // 3L + 2D
        () => randomChoices(LETTERS, 3) + randomChoices(DIGITS, 2),
        // Random
        () => randomChoices(CHARS, 5),
    ];

    while (true) {
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        let username = '';
        try {
            username = pattern();
        } catch (e) {
            username = randomChoices(LETTERS, 5);
        }

        if (username.length === 5) {
            yield username;
        } else if (username.length > 5) {
            yield username.slice(0, 5);
        } else {
            yield username + randomChoices(CHARS, 5 - username.length);
        }
    }
}

function* generateMixed(length = 4) {
    while (true) {
        const username = randomChoices(CHARS, length);
        const hasLetter = [...username].some(c => LETTERS.includes(c));
        const hasDigit = [...username].some(c => DIGITS.includes(c));
        if (hasLetter && hasDigit) {
            yield username;
        }
    }
}

function* generateCleanMixed(length = 4) {
    while (true) {
        let username = '';
        let useLetter = Math.random() < 0.5;
        for (let i = 0; i < length; i++) {
            if (useLetter) {
                username += randomChoice(LETTERS);
            } else {
                username += randomChoice(DIGITS);
            }
            useLetter = !useLetter;
        }
        yield username;
    }
}

function getGenerator(type) {
    const generators = {
        '3c': generate3C,
        '4l_vowel': generate4LVowel,
        '4l': generate4L,
        '4c': generate4C,
        '5l': generate5L,
        '5c': generate5C,
        '5l_meaningful': generate5LMeaningful,
        'mixed': () => generateMixed(4),
        'clean_mixed': () => generateCleanMixed(4),
    };

    const genFunc = generators[type.toLowerCase()];
    if (genFunc) {
        return genFunc();
    }
    throw new Error(`Unknown generator type: ${type}`);
}

module.exports = { getGenerator };
