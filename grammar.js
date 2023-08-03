// SPDX-FileCopyrightText: 2023 Jummit <jummit@web.de>
//
// SPDX-License-Identifier: LGPL-3.0-or-later

// TODO: @readability Break some lines.
module.exports = grammar({
  name: 'wren',

  extras: $ => [$.comment, /\s|\\\r?\n/],

  rules: {
    source_file: $ => seq(optional($.shebang), repeat(choice($._statement, $._expression))),
    // TODO: @completeness Support foreign methods.
    // TODO: @correctness Add all escape codes here.
    string: $ => seq('"', repeat(choice(token.immediate(prec(1, choice(/[^"\\%]+/, /\\./))), seq("%(", repeat($._expression), ")"))), '"'),
    raw_string: $ => seq(/"""/, repeat(/./), /"""/),
    comment: $ => choice(/\/\/.*/, seq("/*", repeat(choice($.comment, /./)), "*/")),
    // TODO: @correctness Differentiate between name, instance fields and static fields.
    identifier: $ => /[a-zA-Z_]+[0-9A-Za-z]*/,
    null: $ => "null",
    number: $ => choice(seq(/[+-]?[0-9]+/, token.immediate(optional(/\.[0-9]+/)), token.immediate(optional(/e[+-]?[0-9]{2}/))), /0x[0-9A-f]*/),
    boolean: $ => choice("true", "false"),
    return_statement: $ => seq("return", $._expression),
    assignment: $ => seq($.identifier, "=", $._expression),
    unary_expression: $ => prec.left(2, seq(alias(choice("!", "-", "~"), $.operator), $._expression)),
    // TODO: @correctness correct prescedence
    binary_expression: $ => prec.left(2, seq($._expression, alias(choice("+", "-", "==", "!=", "<=", ">=", "&&", "||", "/", "*", "%", ">>", "<<", "&", "<", ">", "is"), $.operator), $._expression)),
    block: $ => seq("{", repeat(choice($._statement, $._expression)), "}"),
    _labeled_block: $ => seq("{", field("body", repeat(choice($._statement, $._expression))), "}"),
    parameter: $ => alias($.identifier, "parameter"),
    parameter_list: $ => seq($.parameter, repeat(seq(",", $.parameter))),
    argument_list: $ => seq($._expression, optional(repeat(seq(",", $._expression)))),
    variable_definition: $ => seq("var", $.identifier, "=", $._expression),
    call_expression: $ => prec.left(2, choice(seq($._expression, "(", optional(alias($.argument_list, $.parameter_list)), ")"),
        prec.left(4, seq($._expression, optional(seq("(", optional(alias($.argument_list, $.parameter_list)), ")")), $.call_body)))),
    call_body: $ => seq("{", optional(seq("|", alias($.argument_list, $.parameter_list), "|")), field("body", repeat(choice($._statement, $._expression))), "}"),
    class_definition: $ => seq(repeat($._any_attribute), "class", $.identifier, optional(seq("is", $.identifier)), $.class_body),
    class_body: class_body,
    getter_definition: $ => seq($.identifier, alias($._labeled_block, $.block)),
    setter_definition: $ => seq($.identifier, "=", "(", $.parameter, ")", alias($._labeled_block, $.block)),
    prefix_operator_definition: $ => seq(alias(/[+-]/, $.operator), alias($._labeled_block, $.block)),
    subscript_operator_definition: $ => seq("[", $.parameter_list, "]", alias($._labeled_block, $.block)),
    subscript_setter_definition: $ => seq("[", $.parameter_list, "]", "=", "(", $.parameter, ")", alias($._labeled_block, $.block)),
    infix_operator_definition: $ => seq(alias(/[+-]/, $.operator), "(", $.parameter, ")", alias($._labeled_block, $.block)),
    method_definition: $ => seq($.identifier, "(", optional($.parameter_list), ")", alias($._labeled_block, $.block)),
    constructor: $ => seq("construct", $.method_definition),
    static_method_definition: $ => seq("static", $.method_definition),
    static_getter_definition: $ => seq("static", alias($.getter_definition, "getter")),
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
    _any_attribute: $ => choice($.attribute, $.runtime_attribute),
    attribute: $ => seq("#", choice($.attribute_value, seq($.identifier, "(", seq($.attribute_value, repeat(seq(",", $.attribute_value))), ")"))),
    runtime_attribute: $ => seq("#!", choice($.attribute_value, seq("(", optional(seq($.attribute_value, repeat(seq($.attribute_value, ",")))), ")"))),
    attribute_value: $ => choice($.identifier, seq(field("key", $.identifier), "=", field("value", choice($.identifier, $.string, $.boolean, $.number)))),
    rename: $ => seq($.identifier, "as", $.identifier),
    shebang: $ => /#!.*/,
    _import_entry: $ => choice($.identifier, $.rename),
    import_statement: $ => prec.right(seq("import", $.string, optional(seq("for", $._import_entry, repeat(seq(",", $._import_entry)))))),
    _statement: $ => choice($.return_statement, $.break_statement, $.continue_statement, $.class_definition, $.variable_definition, $.assignment, $.if_statement, $.for_statement, $.while_statement, $.import_statement, $.block),
    _expression: $ => choice($.conditional, $.unary_expression, $.binary_expression, $.raw_string, $.string, $.boolean, $.number, $.null, $.identifier, $.list, $.range, $.map, $.subscript, $.call_expression, $.index_expression),
  }
});

function class_body($) {
  const possible = [$.getter_definition, $.setter_definition,
    $.prefix_operator_definition, $.subscript_operator_definition,
    $.subscript_setter_definition, $.infix_operator_definition, $.constructor,
    $.static_method_definition, $.static_getter_definition, $.method_definition]
  return seq("{", repeat(choice(...possible.map(a => seq(repeat($.attribute), a)))), "}")
}
