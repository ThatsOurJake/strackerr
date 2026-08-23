import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/authenticated-user.interface";
import type {
  SearchResult,
  SearchService,
} from "../../modules/search/search.service";
import { SearchController } from "./search.controller";

const user: AuthenticatedUser = {
  userId: "user-1",
  username: "test-user",
  isAdmin: false,
};

const createResponse = () => ({
  render: jest.fn(),
});

describe("SearchController", () => {
  let searchService: { search: jest.Mock };
  let controller: SearchController;

  beforeEach(() => {
    searchService = { search: jest.fn() };
    controller = new SearchController(
      searchService as unknown as SearchService,
    );
  });

  it("renders grouped full results for queries of at least three characters", async () => {
    const results: SearchResult[] = [
      { id: "movie-1", title: "Severance", type: "MOVIE" },
      { id: "show-1", title: "The Office", type: "TV_SHOW" },
      { id: "movie-2", title: "Seven", type: "MOVIE" },
    ];
    searchService.search.mockResolvedValue(results);
    const response = createResponse();

    await controller.search("  sev  ", user, response as unknown as Response);

    expect(searchService.search).toHaveBeenCalledWith("user-1", "sev");
    expect(response.render).toHaveBeenCalledWith("search", {
      title: "Search",
      query: "sev",
      groups: [
        { type: "MOVIE", results: [results[0], results[2]] },
        { type: "TV_SHOW", results: [results[1]] },
      ],
    });
  });

  it("renders an empty full-results state without searching short queries", async () => {
    const response = createResponse();

    await controller.search("ab", user, response as unknown as Response);

    expect(searchService.search).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith("search", {
      title: "Search",
      query: "ab",
      groups: [],
    });
  });

  it("renders the dropdown partial with at most five results", async () => {
    const results = Array.from({ length: 6 }, (_, index) => ({
      id: `media-${index}`,
      title: `Media ${index}`,
      type: "MOVIE",
    }));
    searchService.search.mockResolvedValue(results);
    const response = createResponse();

    await controller.partial("media", user, response as unknown as Response);

    expect(searchService.search).toHaveBeenCalledWith("user-1", "media");
    expect(response.render).toHaveBeenCalledWith("partials/search-dropdown", {
      layout: false,
      query: "media",
      results: results.slice(0, 5),
    });
  });

  it("renders an empty dropdown without searching short queries", async () => {
    const response = createResponse();

    await controller.partial(undefined, user, response as unknown as Response);

    expect(searchService.search).not.toHaveBeenCalled();
    expect(response.render).toHaveBeenCalledWith("partials/search-dropdown", {
      layout: false,
      query: "",
      results: [],
    });
  });
});
