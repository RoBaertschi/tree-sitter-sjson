/**
 * @file JSON grammar for tree-sitter
 * @author Max Brunsfeld <maxbrunsfeld@gmail.com>
 * @author Amaan Qureshi <amaanq12@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'sjson',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  supertypes: $ => [
    $._value,
  ],

  rules: {
    document: $ => optional($._object_body),

    _value: $ => choice(
      $.object,
      $.array,
      $.number,
      $.string,
      $.true,
      $.false,
      $.null,
    ),

    object: $ => seq(
      '{', optional($._object_body), '}',
    ),

    _object_body: $ => choice(
      $.pair,
      seq(repeat1(seq($.pair, /(,|(\n|(\r\n)))/)), optional($.pair))
    ),

    pair: $ => seq(
      field('key', choice($.string, $.identifier)),
      choice(':', '='),
      field('value', $._value),
    ),

    array: $ => seq(
      '[',
      choice(
        optional($._value),
        seq(repeat1(seq($._value, /(,|(\n|(\r\n)))/)), optional($._value)),
      ),
      ']',
    ),

    // Stolen from the javascript tree sitter
    identifier: _ => {
      const alpha = /[^\x00-\x1F\s\p{Zs}0-9:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/;

      const alphanumeric = /[^\x00-\x1F\s\p{Zs}:;`"'@#.,|^&<=>+\-*/\\%?!~()\[\]{}\uFEFF\u2060\u200B\u2028\u2029]|\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/;
      return token(seq(alpha, repeat(alphanumeric)));
    },

    string: $ => choice($._double_quoted_string, $._single_quoted_string),

    _single_quoted_string: $ => choice(
      seq('\'', '\''),
      seq('\'', $._single_string_content, '\''),
    ),

    _double_quoted_string: $ => choice(
      seq('"', '"'),
      seq('"', $._double_string_content, '"'),
    ),

    _single_string_content: $ => repeat1(choice(
      alias($.single_string_content, $.string_content),
      $.escape_sequence,
    )),

    _double_string_content: $ => repeat1(choice(
      alias($.double_string_content, $.string_content),
      $.escape_sequence,
    )),

    double_string_content: _ => token.immediate(prec(1, /[^\\"\n]+/)),
    single_string_content: _ => token.immediate(prec(1, /[^\\'\n]+/)),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      /(\"|\'|\\|\/|b|f|n|r|t|u|\n|(\r\n))/,
    )),

    _sign: _ => choice('-', '+'),

    number: $ => seq(optional($._sign), choice($._number, $._hexadecimal_number, 'Infinity', 'NaN')),

    _number: $ => {
      const decimalDigits = /\d+/;
      const signedInteger = seq(/[-+]/, decimalDigits);
      const exponentPart = seq(choice('e', 'E'), signedInteger);

      const decimalIntegerLiteral = choice('0', seq(/[1-9]/, optional(decimalDigits)));

      const decimalLiteral = choice(
        seq('.', decimalDigits, optional(exponentPart)),
        seq(decimalIntegerLiteral, '.', optional(decimalDigits), optional(exponentPart)),
        seq(decimalIntegerLiteral, optional(exponentPart)),
      );

      return token(decimalLiteral);
    },

    _hexadecimal_number: $ => {
      const hexadecimalDigit = /[a-fA-F\d]/;
      return token(seq(choice('0x', '0X'), repeat1(hexadecimalDigit)));
    },

    true: _ => 'true',

    false: _ => 'false',

    null: _ => 'null',

    comment: _ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    )),
  },
});

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(choice(',', /(\n|(\r\n))/), rule)));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
