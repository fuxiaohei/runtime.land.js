import * as chai from "chai";
import { parseMultipartForm, getBoundary } from "../src/builtin/formdata/parser.mjs";

const expect = chai.expect;

function DemoData() {
    let body = "trash1\r\n"
    body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n"
    body += "Content-Type: text/plain\r\n"
    body +=
        'Content-Disposition: form-data; name="uploads[]"; filename="A.txt"\r\n'
    body += "\r\n"
    body += "@11X"
    body += "111Y\r\n"
    body += "111Z\rCCCC\nCCCC\r\nCCCCC@\r\n\r\n"
    body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n"
    body += "Content-Type: text/plain\r\n"
    body +=
        'Content-Disposition: form-data; name="uploads[]"; filename="B.txt"\r\n'
    body += "\r\n"
    body += "@22X"
    body += "222Y\r\n"
    body += "222Z\r222W\n2220\r\n666@\r\n"
    body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp\r\n"
    body += 'Content-Disposition: form-data; name="input1"\r\n'
    body += "\r\n"
    body += "value1\r\n"
    body += "------WebKitFormBoundaryvef1fLxmoUdYZWXp--\r\n"
    return {
        body: new TextEncoder().encode(body),
        boundary: "----WebKitFormBoundaryvef1fLxmoUdYZWXp"
    }
}

const expected = [
    {
        name: "uploads[]",
        filename: "A.txt",
        type: "text/plain",
        data: new TextEncoder().encode("@11X111Y\r\n111Z\rCCCC\nCCCC\r\nCCCCC@\r\n")
    },
    {
        name: "uploads[]",
        filename: "B.txt",
        type: "text/plain",
        data: new TextEncoder().encode("@22X222Y\r\n222Z\r222W\n2220\r\n666@")
    },
    { name: "input1", data: new TextEncoder().encode("value1") }
]

describe("FormData-parseMultipartForm", function () {
    it("should parse multipart", function () {
        const { body, boundary } = DemoData()
        const parts = parseMultipartForm(body, boundary)

        expect(parts.length).to.be.equal(3)
        for (let i = 0; i < expected.length; i++) {
            const data = expected[i]
            const part = parts[i]

            expect(data.filename).to.be.equal(part.filename)
            expect(data.name).to.be.equal(part.name)
            expect(data.type).to.be.equal(part.type)
            expect(data.data.toString()).to.be.equal(part.data.toString())
        }
    })

    it("should get boundary", function () {
        const header =
            "multipart/form-data; boundary=----WebKitFormBoundaryvm5A9tzU1ONaGP5B"
        const boundary = getBoundary(header)

        expect(boundary).to.be.equal("----WebKitFormBoundaryvm5A9tzU1ONaGP5B")
    })

    it("should get boundary in single quotes", function () {
        const header =
            'multipart/form-data; boundary="----WebKitFormBoundaryvm5A9tzU1ONaGP5B"'
        const boundary = getBoundary(header)

        expect(boundary).to.be.equal("----WebKitFormBoundaryvm5A9tzU1ONaGP5B")
    })

    it("should get boundary in double quotes", function () {
        const header =
            "multipart/form-data; boundary='----WebKitFormBoundaryvm5A9tzU1ONaGP5B'"
        const boundary = getBoundary(header)

        expect(boundary).to.be.equal("----WebKitFormBoundaryvm5A9tzU1ONaGP5B")
    })

    it("should not parse multipart if boundary is not correct", function () {
        const { body, boundary } = DemoData()
        const parts = parseMultipartForm(body, boundary + "bad")

        expect(parts.length).to.be.equal(0)
    })

    it("should not parse if multipart is not correct", function () {
        const { boundary } = DemoData()
        const parts = parseMultipartForm(new TextEncoder().encode("hellow world"), boundary)

        expect(parts.length).to.be.equal(0)
    })
})
