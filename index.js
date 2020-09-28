const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const Workflow = require("@saltcorn/data/models/workflow");
const FieldRepeat = require("../../models/fieldrepeat");
const { removeEmptyStrings } = require("../../utils");
const {
  field_picker_fields,
  picked_fields_to_query,
  stateFieldsToWhere,
  initial_config_all_fields,
} = require("../../plugin-helper");
const {
  get_viewable_fields,
  stateToQueryString,
} = require("./viewable_fields");
const {
  text,
  div,
  h3,
  style,
  a,
  script,
  pre,
  domReady,
  i,
} = require("@saltcorn/markup/tags");
const readState = (state, fields) => {
  fields.forEach((f) => {
    const current = state[f.name];
    if (typeof current !== "undefined") {
      if (f.type.read) state[f.name] = f.type.read(current);
      else if (f.type === "Key")
        state[f.name] = current === "null" ? null : +current;
    }
  });
  return state;
};
const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Columns",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          //console.log(context);
          const field_picker_repeat = await field_picker_fields({
            table,
            viewname: context.viewname,
          });

          return new Form({
            blurb: "Specify the fields in the table to show",
            fields: [
              new FieldRepeat({
                name: "columns",
                fields: field_picker_repeat,
              }),
            ],
          });
        },
      },
    ],
  });

const run = async (table_id, viewname, {}, state, extraArgs) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  readState(state, fields);
  for (const f of fields) {
    if (f.type === "File") f.attributes = { select_file_where: {} };
    await f.fill_fkey_options();
  }

  //console.log(fields);
  const keyfields = fields
    .filter((f) => f.type === "Key" || f.type === "File")
    .map((f) => f.name);
  const jsfields = fields.map((f) => typeToJsGridType(f.type, f));
  if (table.versioned) {
    jsfields.push({ name: "_versions", title: "Versions", type: "versions" });
  }
  jsfields.push({ type: "control" });
  return [
    script(`var edit_fields=${JSON.stringify(jsfields)};`),
    script(domReady(versionsField(table.name))),
    script(
      domReady(`$("#jsGrid").jsGrid({
                width: "100%",
                sorting: true,
                paging: true,
                autoload: true,
                inserting: true,
                editing: true,
                         
                controller: 
                  jsgrid_controller("${table.name}", ${JSON.stringify(
        table.versioned
      )}, ${JSON.stringify(keyfields)}),
         
                fields: edit_fields
            });
         `)
    ),
    div({ id: "jsGrid" }),
  ];
};

const headers = [
  {
    script: "https://cdnjs.cloudflare.com/ajax/libs/jsgrid/1.5.3/jsgrid.min.js",
    integrity:
      "sha512-blBYtuTn9yEyWYuKLh8Faml5tT/5YPG0ir9XEABu5YCj7VGr2nb21WPFT9pnP4fcC3y0sSxJR1JqFTfTALGuPQ==",
  },
  {
    script:
      "https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.6/flatpickr.min.js",
    integrity:
      "sha512-Nc36QpQAS2BOjt0g/CqfIi54O6+UWTI3fmqJsnXoU6rNYRq8vIQQkZmkrRnnk4xKgMC3ESWp69ilLpDm6Zu8wQ==",
  },
  {
    script: "/gridedit.js",
  },
  {
    css: "https://cdnjs.cloudflare.com/ajax/libs/jsgrid/1.5.3/jsgrid.min.css",
    integrity:
      "sha512-3Epqkjaaaxqq/lt5RLJsTzP6cCIFyipVRcY4BcPfjOiGM1ZyFCv4HHeWS7eCPVaAigY3Ha3rhRgOsWaWIClqQQ==",
  },
  {
    css:
      "https://cdnjs.cloudflare.com/ajax/libs/jsgrid/1.5.3/jsgrid-theme.min.css",
    integrity:
      "sha512-jx8R09cplZpW0xiMuNFEyJYiGXJM85GUL+ax5G3NlZT3w6qE7QgxR4/KE1YXhKxijdVTDNcQ7y6AJCtSpRnpGg==",
  },
  {
    css:
      "https://cdnjs.cloudflare.com/ajax/libs/flatpickr/4.6.6/flatpickr.min.css",
    integrity:
      "sha512-OtwMKauYE8gmoXusoKzA/wzQoh7WThXJcJVkA29fHP58hBF7osfY0WLCIZbwkeL9OgRCxtAfy17Pn3mndQ4PZQ==",
  },
];

module.exports = {
  sc_plugin_api_version: 1,
  headers,
  viewtemplates: [
    {
      name: "JsGrid",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
    },
  ],
};
