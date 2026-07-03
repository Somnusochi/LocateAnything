import { render } from "@/utils/test-utils";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {describe, it, expect} from "vitest";
import { Layout } from "./index";

describe("Layout", () => {
  it("renders without crashing", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/annotate"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/annotate" element={<div>workspace</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(getByText("VLM-AutoYOLO")).toBeTruthy();
    expect(getByText("workspace")).toBeTruthy();
  });
});
