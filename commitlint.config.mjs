/**
 * Conventional Commit rules for the repository.
 *
 * @module commitlint.config
 */

export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'refactor',
                'perf',
                'test',
                'docs',
                'style',
                'build',
                'ci',
                'chore',
                'revert',
            ],
        ],
        'type-case': [2, 'always', 'lower-case'],
        'scope-case': [2, 'always', 'lower-case'],
        'subject-empty': [2, 'never'],
        'subject-full-stop': [2, 'never', '.'],
        'subject-case': [
            2,
            'never',
            ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
        ],
        'header-max-length': [2, 'always', 72],
        'body-leading-blank': [2, 'always'],
        'body-max-line-length': [2, 'always', 100],
        'footer-leading-blank': [2, 'always'],
    },
};
