export function sleep(ms = 500): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// tag::extractids[]
export function extractIds(input: any): string[] {
  let output: string[] = [];

  // Function to handle an object
  const handleObject = (item: any) => {
    for (const key in item) {
      if (key === "_id") {
        if (!output.includes(item[key])) {
          output.push(item[key]);
        }
      } else if (typeof item[key] === "object" && item[key] !== null) {
        // Recurse into the object if it is not null
        output = output.concat(extractIds(item[key]));
      }
    }
  };

  if (Array.isArray(input)) {
    // If the input is an array, iterate over each element
    input.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        handleObject(item);
      }
    });
  } else if (typeof input === "object" && input !== null) {
    // If the input is an object, handle it directly
    handleObject(input);
  }

  return output;
}
// end::extractids[]
