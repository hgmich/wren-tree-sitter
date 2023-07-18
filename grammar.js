// SPDX-FileCopyrightText: 2023 Jummit <jummit@web.de>
//
// SPDX-License-Identifier: LGPL-3.0-or-later

module.exports = grammar({
  name: 'wren',

  rules: {
    source_file: $ => repeat(choice($.comment, $._statement, $._expression)),
    // TODO: @correctness add all escape codes here
    string: $ => seq("\"", repeat(choice(/[^"\\]/, "\\\"", seq("%(", repeat($._expression), ")"))), "\""),
    raw_string: $ => seq(/"""/, repeat(/./), /"""/),
    comment: $ => choice(/\/\/.*/, seq("/*", repeat(choice($.comment, /./)), "*/")),
    identifier: $ => /[a-zA-Z_]+[0-9A-Za-z]*/,
    null: $ => "null",
    number: $ => choice(seq(/[+-]?[0-9]+/, token.immediate(optional(/\.[0-9]+/)), token.immediate(optional(/e[+-]?[0-9]{2}/))), /0x[0-9A-f]*/),
    boolean: $ => choice("true", "false"),
    return_statement: $ => seq("return", $._expression),
    assignment: $ => seq($.identifier, "=", $._expression),
    // TODO: @correctness correct prescedence
    binary_expression: $ => prec.left(1, seq($._expression, alias(choice("+", "-", "==", "!=", "&&", "||", "/", "*"), $.operator), $._expression)),
    block: $ => seq("{", repeat(choice($._statement, $._expression)), "}"),
    parameter: $ => alias($.identifier, "parameter"),
    parameter_list: $ => seq($.parameter, repeat(seq(",", $.parameter))),
    argument_list: $ => seq($._expression, optional(repeat(seq(",", $._expression)))),
    variable_definition: $ => seq("var", $.identifier, "=", $._expression),
    call_expression: $ => choice(prec(1, seq($._expression, $.block)), seq($._expression, "(", optional(alias($.argument_list, $.parameter_list)), ")")),
    class_definition: $ => seq("class", $.identifier, optional(seq("is", $.identifier)), $.class_body),
    class_body: $ => seq("{", repeat(choice($.getter_definition, $.setter_definition, $.prefix_operator_definition, $.subscript_operator_definition, $.subscript_setter_definition, $.infix_operator_definition, $.constructor, $.static_method_definition, $.method_definition)), "}"),
    getter_definition: $ => seq($.identifier, $.block),
    setter_definition: $ => seq($.identifier, "=", "(", $.parameter, ")", $.block),
    prefix_operator_definition: $ => seq(alias(/[+-]/, $.operator), $.block),
    subscript_operator_definition: $ => seq("[", $.parameter_list, "]", $.block),
    subscript_setter_definition: $ => seq("[", $.parameter_list, "]", "=", "(", $.parameter, ")", $.block),
    infix_operator_definition: $ => seq(alias(/[+-]/, $.operator), "(", $.parameter, ")", $.block),
    method_definition: $ => seq($.identifier, "(", optional($.parameter_list), ")", $.block),
    constructor: $ => seq("construct", $.method_definition),
    static_method_definition: $ => seq("static", $.method_definition),
    conditional: $ => prec.left(seq($._expression, "?", $._expression, ":", $._expression)),
    list: $ => seq("[", optional(seq($._expression, optional(repeat(seq(",", $._expression))))), "]"),
    index_expression: $ => seq($._expression, ".", $.identifier),
    subscript: $ => prec(1, seq($._expression, "[", $._expression, "]")),
    range: $ => prec.left(seq($._expression, choice("..", "..."), $._expression)),
    if_statement: $ => prec.left(seq("if", "(", $._expression, ")", choice($._statement, $._expression), optional(seq("else", alias($._statement, $.else_branch))))),
    for_statement: $ => seq("for", "(", $.identifier, "in", $._expression, ")", $._statement),
    while_statement: $ => seq("while", "(", $._expression, ")", choice($._expression, $._statement)),
    pair: $ => seq($._expression, ":", $._expression),
    map: $ => prec(1, seq("{", optional(seq($.pair, repeat(seq(",", $.pair)), optional(","))), "}")),
    break_statement: $ => "break",
    continue_statement: $ => "continue",
    rename: $ => seq($.identifier, "as", $.identifier),
    _import_entry: $ => choice($.identifier, $.rename),
    import_statement: $ => prec.right(seq("import", $.string, optional(seq("for", $._import_entry, repeat(seq(",", $._import_entry)))))),
    _statement: $ => choice($.return_statement, $.break_statement, $.continue_statement, $.class_definition, $.variable_definition, $.assignment, $.if_statement, $.for_statement, $.while_statement, $.import_statement, $.block),
    _expression: $ => choice($.conditional, $.binary_expression, $.raw_string, $.string, $.boolean, $.number, $.null, $.identifier, $.list, $.range, $.map, $.subscript, $.call_expression, $.index_expression),
  }
});

