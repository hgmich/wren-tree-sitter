// SPDX-FileCopyrightText: 2023 Jummit <jummit@web.de>
//
// SPDX-License-Identifier: LGPL-3.0-or-later

// TODO: @readability Break some lines.
module.exports = grammar({
  name: "wren",

  extras: ($) => [$.comment, /\s|\\\r?\n/],

  rules: {
    source_file: ($) =>
      seq(optional($.shebang), repeat(choice($._statement, $._expression))),
    // TODO: @correctness Add all escape codes here.
    string: ($) =>
      seq(
        '"',
        repeat(
          choice(
            token.immediate(prec(1, choice(/[^"\\%]+/, /\\./))),
            seq("%(", repeat($._expression), ")"),
          ),
        ),
        '"',
      ),
    raw_string: ($) => seq(/"""/, repeat(/./), /"""/),
    comment: ($) =>
      choice(/\/\/.*/, seq("/*", repeat(choice($.comment, /./)), "*/")),
    static_field: ($) => /__[0-9A-Za-z]+[0-9A-Za-z_]*/,
    field: ($) => /_[0-9A-Za-z]+[0-9A-Za-z_]*/,
    constant_name: ($) => /[_A-Z]+[0-9A-Z_]*/,
    class_name: ($) => /[A-Z]+[0-9A-Za-z_]*/,
    name: ($) => /[a-zA-Z]+[0-9A-Za-z_]*/,
    null: ($) => "null",
    number: ($) =>
      choice(
        seq(
          /[+-]?[0-9]+/,
          token.immediate(optional(/\.[0-9]+/)),
          token.immediate(optional(/e[+-]?[0-9]{2}/)),
        ),
        /0x[0-9A-f]*/,
      ),
    boolean: ($) => choice("true", "false"),
    return_statement: ($) => seq("return", $._expression),
    assignment: ($) =>
      seq(field("left", $._expression), "=", field("right", $._expression)),
    unary_expression: ($) =>
      prec.left(
        2,
        seq(alias(choice("!", "-", "~"), $.operator), $._expression),
      ),
    // TODO: @correctness correct prescedence
    binary_expression: ($) =>
      prec.left(
        2,
        seq(
          $._expression,
          alias(
            choice(
              "+",
              "-",
              "==",
              "!=",
              "<=",
              ">=",
              "&&",
              "||",
              "/",
              "*",
              "%",
              ">>",
              "<<",
              "&",
              "<",
              ">",
              "is",
              "|",
            ),
            $.operator,
          ),
          $._expression,
        ),
      ),
    block: ($) => seq("{", repeat(choice($._statement, $._expression)), "}"),
    parameter: ($) => alias($.name, "parameter"),
    parameter_list: ($) => seq($.parameter, repeat(seq(",", $.parameter))),
    argument_list: ($) =>
      seq($._expression, optional(repeat(seq(",", $._expression)))),
    variable_definition: ($) =>
      seq("var", field("name", $.name), optional(seq("=", $._expression))),
    call_expression: ($) =>
      prec.left(
        2,
        choice(
          seq(
            field("function", choice($.name, $.index_expression)),
            "(",
            optional(alias($.argument_list, $.parameter_list)),
            ")",
          ),
          prec.left(
            4,
            seq(
              field("function", choice($.name, $.index_expression)),
              optional(
                seq(
                  "(",
                  optional(alias($.argument_list, $.parameter_list)),
                  ")",
                ),
              ),
              $.call_body,
            ),
          ),
        ),
      ),
    call_body: ($) =>
      seq(
        "{",
        optional(seq("|", $.parameter_list, "|")),
        field("body", repeat(choice($._statement, $._expression))),
        "}",
      ),
    class_definition: ($) =>
      seq(
        repeat($._any_attribute),
        optional("foreign"),
        "class",
        field("name", $.name),
        optional(seq("is", field("superclass_name", $.name))),
        $.class_body,
      ),
    class_body: class_body,
    getter_declaration: ($) => $.name,
    setter_declaration: ($) => seq($.name, "=", "(", $.parameter, ")"),
    getter_definition: ($) => seq($.getter_declaration, field("body", $.block)),
    setter_definition: ($) => seq($.setter_declaration, field("body", $.block)),
    prefix_operator_definition: ($) =>
      seq(alias(/[+-]/, $.operator), field("body", $.block)),
    _subscript_params: ($) => seq("[", $.parameter_list, "]"),
    subscript_operator_definition: ($) =>
      seq($._subscript_params, field("body", $.block)),
    subscript_setter_definition: ($) =>
      seq(
        $._subscript_params,
        "=",
        "(",
        $.parameter,
        ")",
        field("body", $.block),
      ),
    foreign_subscript_operator_declaration: ($) =>
      seq("foreign", $._subscript_params),
    foreign_subscript_setter_declaration: ($) =>
      seq("foreign", $._subscript_params, "=", "(", $.parameter, ")"),
    infix_operator_definition: ($) =>
      seq(
        alias(/[+-]/, $.operator),
        "(",
        $.parameter,
        ")",
        field("body", $.block),
      ),
    method_declaration: ($) =>
      seq($.name, "(", optional($.parameter_list), ")"),
    method_definition: ($) => seq($.method_declaration, field("body", $.block)),
    constructor: ($) => seq("construct", $.method_definition),
    static_method_definition: ($) => seq("static", $.method_definition),
    static_getter_definition: ($) => seq("static", $.getter_definition),
    static_setter_definition: ($) => seq("static", $.setter_definition),
    foreign_method_declaration: ($) =>
      seq("foreign", optional("static"), $.method_declaration),
    foreign_getter_declaration: ($) =>
      seq("foreign", optional("static"), $.getter_declaration),
    foreign_setter_declaration: ($) =>
      seq("foreign", optional("static"), $.setter_declaration),
    conditional: ($) =>
      prec.left(seq($._expression, "?", $._expression, ":", $._expression)),
    list: ($) =>
      seq(
        "[",
        optional(seq($._expression, optional(repeat(seq(",", $._expression))))),
        "]",
      ),
    index_expression: ($) =>
      prec(
        1,
        seq(field("indexee", $._expression), ".", field("index", $.name)),
      ),
    subscript: ($) => prec(1, seq($._expression, "[", $._expression, "]")),
    range: ($) =>
      prec.left(seq($._expression, choice("..", "..."), $._expression)),
    if_statement: ($) =>
      prec.left(
        seq(
          "if",
          "(",
          $._expression,
          ")",
          choice($._statement, $._expression),
          optional(seq("else", alias($._statement, $.else_branch))),
        ),
      ),
    for_statement: ($) =>
      seq(
        "for",
        "(",
        field("loop_variable", $.name),
        "in",
        $._expression,
        ")",
        $._statement,
      ),
    while_statement: ($) =>
      seq(
        "while",
        "(",
        $._expression,
        ")",
        choice($._expression, $._statement),
      ),
    pair: ($) => seq($._expression, ":", $._expression),
    map: ($) =>
      prec(
        1,
        seq(
          "{",
          optional(seq($.pair, repeat(seq(",", $.pair)), optional(","))),
          "}",
        ),
      ),
    break_statement: ($) => "break",
    continue_statement: ($) => "continue",
    _any_attribute: ($) => choice($.attribute, $.runtime_attribute),
    attribute: ($) =>
      seq(
        "#",
        choice(
          $.attribute_value,
          seq(
            $.name,
            "(",
            seq($.attribute_value, repeat(seq(",", $.attribute_value))),
            ")",
          ),
        ),
      ),
    runtime_attribute: ($) =>
      seq(
        "#!",
        choice(
          $.attribute_value,
          seq(
            "(",
            optional(
              seq($.attribute_value, repeat(seq($.attribute_value, ","))),
            ),
            ")",
          ),
        ),
      ),
    attribute_value: ($) =>
      choice(
        $.name,
        seq(
          field("key", $.name),
          "=",
          field("value", choice($.name, $.string, $.boolean, $.number)),
        ),
      ),
    rename: ($) => seq($.name, "as", $.name),
    shebang: ($) => /#!.*/,
    _import_entry: ($) => choice($.name, $.rename),
    import_statement: ($) =>
      prec.right(
        seq(
          "import",
          $.string,
          optional(
            seq(
              field("for", "for"),
              $._import_entry,
              repeat(seq(",", $._import_entry)),
            ),
          ),
        ),
      ),
    parenthetical: ($) => seq("(", $._expression, ")"),
    _statement: ($) =>
      choice(
        $.return_statement,
        $.break_statement,
        $.continue_statement,
        $.class_definition,
        $.variable_definition,
        $.assignment,
        $.if_statement,
        $.for_statement,
        $.while_statement,
        $.import_statement,
        $.block,
      ),
    _expression: ($) =>
      choice(
        $.parenthetical,
        $.conditional,
        $.unary_expression,
        $.binary_expression,
        $.raw_string,
        $.string,
        $.boolean,
        $.number,
        $.null,
        $.static_field,
        $.field,
        $.constant_name,
        $.class_name,
        $.name,
        $.list,
        $.range,
        $.map,
        $.subscript,
        $.call_expression,
        $.index_expression,
      ),
  },
});

function class_body($) {
  const possible = [
    $.getter_definition,
    $.setter_definition,
    $.prefix_operator_definition,
    $.subscript_operator_definition,
    $.subscript_setter_definition,
    $.foreign_subscript_operator_declaration,
    $.foreign_subscript_setter_declaration,
    $.infix_operator_definition,
    $.constructor,
    $.foreign_method_declaration,
    $.foreign_getter_declaration,
    $.foreign_setter_declaration,
    $.static_method_definition,
    $.static_getter_definition,
    $.static_setter_definition,
    $.method_definition,
  ];
  return seq(
    "{",
    repeat(choice(...possible.map((a) => seq(repeat($.attribute), a)))),
    "}",
  );
}
