// These tests were taken from WPT with some modifications:
// https://github.com/web-platform-tests/wpt/tree/e42493210e7b78d3c77043cb9fdb16e8eefafb9a/xhr/formdata

const assert = (condition, message) => {
  if (!condition) {
    let msg =
      typeof message === "function" ? message() : message || "Assertion failed";
    throw new Error(msg);
  }
};


const assert_array_equals = (array1, array2, message) => {
  if (array1.length != array2.length || array1.length === undefined) {
    throw new Error(`Expected ${array1} to be equal to ${array2}: ${message}`);
  }

  for (let i in array1) {
    if (array1[i] != array2[i]) {
      throw new Error(
        `Expected ${array1} to be equal to ${array2}: ${message}`
      );
    }
  }

  // Make sure array2 has no keys that array1 doesn't
  for (let i in array2) {
    if (array1[i] != array2[i]) {
      throw new Error(
        `Expected ${array1} to be equal to ${array2}: ${message}`
      );
    }
  }
};


const assert_equals = (actual, expected, message) => {
  assert(
    actual === expected,
    () => `Expected ${expected} but got ${actual}: ${message}`
  );
};

const assert_not_equals = (actual, expected, message) => {
  assert(
    actual !== expected,
    () => `Expected ${expected} to be unequal to ${actual}: ${message}`
  );
};

const assert_greater_than_equal = (v1, v2, message) => {
  assert(
    v1 >= v2,
    message || `Expected ${v1} to be greater than or equal to ${v1}`
  );
};

const assert_less_than = (v1, v2, message) => {
  assert(
    v1 < v2,
    message || `Expected ${v1} to be greater than or equal to ${v1}`
  );
};

const assert_less_than_equal = (v1, v2, message) => {
  assert(
    v1 <= v2,
    message || `Expected ${v1} to be greater than or equal to ${v1}`
  );
};


const assert_true = (condition, message) => {
  if (condition !== true) {
    throw new Error(message || "Assertion failed");
  }
};

const test = (f, desc) => {
  try {
    f({
      unreached_func: (msg) => () => assert_unreached(msg),
    });
  } catch (e) {
    throw new Error(`Test ${desc} failed with ${e}`);
  }
};


async function handleRequest(request) {
  try {
    test(function () {
      assert_equals(create_formdata(['key', 'value1']).get('key'), "value1");
    }, 'testFormDataAppend1');
    test(function () {
      assert_equals(create_formdata(['key', 'value2'], ['key', 'value1']).get('key'), "value2");
    }, 'testFormDataAppend2');
    test(function () {
      assert_equals(create_formdata(['key', undefined]).get('key'), "undefined");
    }, 'testFormDataAppendUndefined1');
    test(function () {
      assert_equals(create_formdata(['key', undefined], ['key', 'value1']).get('key'), "undefined");
    }, 'testFormDataAppendUndefined2');
    test(function () {
      assert_equals(create_formdata(['key', null]).get('key'), "null");
    }, 'testFormDataAppendNull1');
    test(function () {
      assert_equals(create_formdata(['key', null], ['key', 'value1']).get('key'), "null");
    }, 'testFormDataAppendNull2');
    test(function () {
      var before = new Date(new Date().getTime() - 2000); // two seconds ago, in case there's clock drift
      var fd = create_formdata(['key', new Blob(), 'blank.txt']).get('key');
      assert(fd instanceof File, "OOPS!");
      assert(fd instanceof Blob, "DOUBLE OOPS!");
      assert_equals(fd.name, "blank.txt");
      assert_equals(fd.type, "");
      assert_equals(fd.size, 0);
      assert_greater_than_equal(fd.lastModified, before);
      assert_less_than_equal(fd.lastModified, new Date());
    }, 'testFormDataAppendEmptyBlob');
    test(function () {
      var fd = create_formdata(['key', 'value1'], ['key', 'value2']);
      fd.delete('key');
      assert_equals(fd.get('key'), null);
    }, 'testFormDataDelete');
    test(function () {
      var fd = create_formdata(['key', 'value1'], ['key', 'value2']);
      fd.delete('nil');
      assert_equals(fd.get('key'), 'value1');
    }, 'testFormDataDeleteNonExistentKey');
    test(function () {
      var fd = create_formdata(['key1', 'value1'], ['key2', 'value2']);
      fd.delete('key1');
      assert_equals(fd.get('key1'), null);
      assert_equals(fd.get('key2'), 'value2');
    }, 'testFormDataDeleteOtherKey');

    var fd = new FormData();
    fd.append('n1', 'v1');
    fd.append('n2', 'v2');
    fd.append('n3', 'v3');
    fd.append('n1', 'v4');
    fd.append('n2', 'v5');
    fd.append('n3', 'v6');
    fd.delete('n2');

    var file = new File(['hello'], "hello.txt");
    fd.append('f1', file);

    var expected_keys = ['n1', 'n3', 'n1', 'n3', 'f1'];
    var expected_values = ['v1', 'v3', 'v4', 'v6', file];
    test(function () {
      var mykeys = [], myvalues = [];
      for (var entry of fd) {
        assert_equals(entry.length, 2,
          'Default iterator should yield key/value pairs');
        mykeys.push(entry[0]);
        myvalues.push(entry[1]);
      }
      assert_array_equals(mykeys, expected_keys,
        'Default iterator should see duplicate keys');
      assert_array_equals(myvalues, expected_values,
        'Default iterator should see non-deleted values');
    }, 'Iterator should return duplicate keys and non-deleted values');
    test(function () {
      var mykeys = [], myvalues = [];
      for (var entry of fd.entries()) {
        assert_equals(entry.length, 2,
          'entries() iterator should yield key/value pairs');
        mykeys.push(entry[0]);
        myvalues.push(entry[1]);
      }
      assert_array_equals(mykeys, expected_keys,
        'entries() iterator should see duplicate keys');
      assert_array_equals(myvalues, expected_values,
        'entries() iterator should see non-deleted values');
    }, 'Entries iterator should return duplicate keys and non-deleted values');
    test(function () {
      var mykeys = [];
      for (var entry of fd.keys())
        mykeys.push(entry);
      assert_array_equals(mykeys, expected_keys,
        'keys() iterator should see duplicate keys');
    }, 'Keys iterator should return duplicates');
    test(function () {
      var myvalues = [];
      for (var entry of fd.values())
        myvalues.push(entry);
      assert_array_equals(myvalues, expected_values,
        'values() iterator should see non-deleted values');
    }, 'Values iterator should return non-deleted values');
    test(function () {
      assert_equals(create_formdata(['key', 'value1'], ['key', 'value2']).get('key'), "value1");
    }, 'testFormDataGet');
    test(function () {
      assert_equals(create_formdata(['key', 'value1'], ['key', 'value2']).get('nil'), null);
    }, 'testFormDataGetNull1');
    test(function () {
      assert_equals(create_formdata().get('key'), null);
    }, 'testFormDataGetNull2');
    test(function () {
      assert_array_equals(create_formdata(['key', 'value1'], ['key', 'value2']).getAll('key'), ["value1", "value2"]);
    }, 'testFormDataGetAll');
    test(function () {
      assert_array_equals(create_formdata(['key', 'value1'], ['key', 'value2']).getAll('nil'), []);
    }, 'testFormDataGetAllEmpty1');
    test(function () {
      assert_array_equals(create_formdata().getAll('key'), []);
    }, 'testFormDataGetAllEmpty2');
    test(function () {
      assert_equals(create_formdata(['key', 'value1'], ['key', 'value2']).has('key'), true);
    }, 'testFormDataHas');
    test(function () {
      assert_equals(create_formdata(['key', 'value1'], ['key', 'value2']).has('nil'), false);
    }, 'testFormDataHasEmpty1');
    test(function () {
      assert_equals(create_formdata().has('key'), false);
    }, 'testFormDataHasEmpty2');
    test(() => {
      const formData = createFormData([["foo", "0"],
      ["baz", "1"],
      ["BAR", "2"]]);
      const actualKeys = [];
      const actualValues = [];
      for (const [name, value] of formData) {
        actualKeys.push(name);
        actualValues.push(value);
        formData.delete("baz");
      }
      assert_array_equals(actualKeys, ["foo", "BAR"]);
      assert_array_equals(actualValues, ["0", "2"]);
    }, "Iteration skips elements removed while iterating");
    test(() => {
      const formData = createFormData([["foo", "0"],
      ["baz", "1"],
      ["BAR", "2"],
      ["quux", "3"]]);
      const actualKeys = [];
      const actualValues = [];
      for (const [name, value] of formData) {
        actualKeys.push(name);
        actualValues.push(value);
        if (name === "baz")
          formData.delete("foo");
      }
      assert_array_equals(actualKeys, ["foo", "baz", "quux"]);
      assert_array_equals(actualValues, ["0", "1", "3"]);
    }, "Removing elements already iterated over causes an element to be skipped during iteration");
    test(() => {
      const formData = createFormData([["foo", "0"],
      ["baz", "1"],
      ["BAR", "2"],
      ["quux", "3"]]);
      const actualKeys = [];
      const actualValues = [];
      for (const [name, value] of formData) {
        actualKeys.push(name);
        actualValues.push(value);
        if (name === "baz")
          formData.append("X-yZ", "4");
      }
      assert_array_equals(actualKeys, ["foo", "baz", "BAR", "quux", "X-yZ"]);
      assert_array_equals(actualValues, ["0", "1", "2", "3", "4"]);
    }, "Appending a value pair during iteration causes it to be reached during iteration");
    test(function () {
      assert_equals(create_formdata_set(['key', 'value1']).get('key'), "value1");
    }, 'testFormDataSet1');
    test(function () {
      assert_equals(create_formdata_set(['key', 'value2'], ['key', 'value1']).get('key'), "value1");
    }, 'testFormDataSet2');
    test(function () {
      assert_equals(create_formdata_set(['key', undefined]).get('key'), "undefined");
    }, 'testFormDataSetUndefined1');
    test(function () {
      assert_equals(create_formdata_set(['key', undefined], ['key', 'value1']).get('key'), "value1");
    }, 'testFormDataSetUndefined2');
    test(function () {
      assert_equals(create_formdata_set(['key', null]).get('key'), "null");
    }, 'testFormDataSetNull1');
    test(function () {
      assert_equals(create_formdata_set(['key', null], ['key', 'value1']).get('key'), "value1");
    }, 'testFormDataSetNull2');
    test(function () {
      var fd = new FormData();
      fd.set('key', new Blob([]), 'blank.txt');
      var file = fd.get('key');

      assert_true(file instanceof File);
      assert_equals(file.name, 'blank.txt');
    }, 'testFormDataSetEmptyBlob');

    const formData = new FormData();

    test(() => {
      const formData = new FormData();
      const value = new Blob();
      formData.set("blob-1", value);
      const blob1 = formData.get("blob-1");
      assert_not_equals(blob1, value);
      // assert_equals(blob1.constructor.name, "File");
      assert_equals(blob1.name, "blob");
      assert_equals(blob1.type, "");
      assert_equals(formData.get("blob-1") === formData.get("blob-1"), true, "should return the same value when get the same blob entry from FormData");
      assert_less_than(Math.abs(blob1.lastModified - Date.now()), 200, "lastModified should be now");
    }, "blob without type");

    test(() => {
      const value = new Blob([], { type: "text/plain" });
      formData.set("blob-2", value);
      const blob2 = formData.get("blob-2");
      assert_not_equals(blob2, value);
      // assert_equals(blob2.constructor.name, "File");
      assert_equals(blob2.name, "blob");
      assert_equals(blob2.type, "text/plain");
      assert_less_than(Math.abs(blob2.lastModified - Date.now()), 200, "lastModified should be now");
    }, "blob with type");

    test(() => {
      const value = new Blob();
      formData.set("blob-3", value, "custom name");
      const blob3 = formData.get("blob-3");
      assert_not_equals(blob3, value);
      // assert_equals(blob3.constructor.name, "File");
      assert_equals(blob3.name, "custom name");
      assert_equals(blob3.type, "");
      assert_less_than(Math.abs(blob3.lastModified - Date.now()), 200, "lastModified should be now");
    }, "blob with custom name");

    test(() => {
      const value = new File([], "name");
      formData.set("file-1", value);
      const file1 = formData.get("file-1");
      assert_equals(file1, value);
      // assert_equals(file1.constructor.name, "File");
      assert_equals(file1.name, "name");
      assert_equals(file1.type, "");
      assert_less_than(Math.abs(file1.lastModified - Date.now()), 200, "lastModified should be now");
    }, "file without lastModified or custom name");

    test(() => {
      const value = new File([], "name", { lastModified: 123 });
      formData.set("file-2", value, "custom name");
      const file2 = formData.get("file-2");
      assert_not_equals(file2, value);
      // assert_equals(file2.constructor.name, "File");
      assert_equals(file2.name, "custom name");
      assert_equals(file2.type, "");
      assert_equals(file2.lastModified, 123, "lastModified should be 123");
    }, "file with lastModified and custom name");

    function create_formdata() {
      var fd = new FormData();
      for (var i = 0; i < arguments.length; i++) {
        fd.append.apply(fd, arguments[i]);
      };
      return fd;
    }

    function create_formdata_set() {
      var fd = new FormData();
      for (var i = 0; i < arguments.length; i++) {
        fd.set.apply(fd, arguments[i]);
      };
      return fd;
    }

    function createFormData(input) {
      const formData = new FormData();

      for (const [name, value] of input) {
        formData.append(name, value);
      }

      return formData;
    }

    return new Response('All tests passed!');
  }
  catch (e) {
    return new Response(e.toString() + "\n" + e.stack, { status: 500 });
  }
}

export default {
  async fetch(request) {
    return handleRequest(request);
  }
}