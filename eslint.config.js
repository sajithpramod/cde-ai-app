const js = require('@eslint/js');
const globals = require('globals');
const securityPlugin = require('eslint-plugin-security');

module.exports = [
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            security: securityPlugin,
        },
        rules: {
            ...js.configs.recommended.rules,
            ...securityPlugin.configs.recommended.rules, // Security rules
            indent: ['error', 4],
            'no-console': 'warn',
        },
    },
];
