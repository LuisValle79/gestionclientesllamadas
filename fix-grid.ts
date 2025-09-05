import { Project, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

project.getSourceFiles("src/**/*.{ts,tsx}").forEach((file) => {
  let changed = false;

  file.getDescendantsOfKind(SyntaxKind.JsxOpeningElement).forEach((el) => {
    const tagName = el.getTagNameNode().getText();

    // Cambiar Grid2 -> Grid
    if (tagName === "Grid2") {
      el.getTagNameNode().replaceWithText("Grid");
      changed = true;
    }

    // Migrar size -> item + xs sm md
    const sizeAttr = el.getAttribute("size");
    if (sizeAttr) {
      const initializer = sizeAttr.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
      if (initializer) {
        const props = initializer.getProperties().map((p) => p.getText().replace(":", "="));
        el.addAttribute({ name: "item" });
        props.forEach((prop) => {
          const [k, v] = prop.split("=");
          el.addAttribute({ name: k.trim(), initializer: `{${v.trim()}}` });
        });
        sizeAttr.remove();
        changed = true;
      }
    }
  });

  if (changed) {
    console.log(`Migrado: ${file.getBaseName()}`);
  }
});

project.saveSync();
