#[cfg(test)]
use reqwest::StatusCode;

#[cfg(test)]
static URL_ADDRESS: &str = "http://127.0.0.1:9830";
#[cfg(test)]
static X_LAND_M: &str = "x-land-m";
#[cfg(test)]
static JS_DIR: &str = "tests/js-files/";

#[tokio::test]
async fn js_1_hello() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/1-hello.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "Hello World!");
}

#[tokio::test]
async fn js_2_blob() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/2-blob.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let content_length = req.headers().get("content-length").unwrap();
    assert_eq!(content_length, "12");
    let body = req.text().await.unwrap();
    assert_eq!(body, "Hello, Blob!");
}

#[tokio::test]
async fn js_2_1_file() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/2-1-file.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}

#[tokio::test]
async fn js_3_headers() {
    let resp = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/3-headers.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.text().await.unwrap();
    assert_eq!(
        body,
        "All Headers:\ncontent-type: text/plain\nx-custom-header: CustomValue\n"
    );

    // append
    let resp = reqwest::Client::new()
        .get(format!("{}/append", URL_ADDRESS))
        .header(X_LAND_M, format!("{}/3-headers.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(
        resp.headers()
            .get("X-Appended-Header")
            .unwrap()
            .to_str()
            .unwrap(),
        "AppendedValue"
    );
    let body = resp.text().await.unwrap();
    assert_eq!(body, "Header appended");

    // delete
    let resp = reqwest::Client::new()
        .get(format!("{}/delete", URL_ADDRESS))
        .header(X_LAND_M, format!("{}/3-headers.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert!(resp.headers().get("X-Custom-Header").is_none());
    let body = resp.text().await.unwrap();
    assert_eq!(body, "Header deleted");

    // get
    let resp = reqwest::Client::new()
        .get(format!("{}/get", URL_ADDRESS))
        .header(X_LAND_M, format!("{}/3-headers.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.text().await.unwrap();
    assert_eq!(body, "Content-Type is text/plain");

    // has
    let resp = reqwest::Client::new()
        .get(format!("{}/has", URL_ADDRESS))
        .header(X_LAND_M, format!("{}/3-headers.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.text().await.unwrap();
    assert_eq!(body, "Has Content-Type: true");

    // set
    let resp = reqwest::Client::new()
        .get(format!("{}/set", URL_ADDRESS))
        .header(X_LAND_M, format!("{}/3-headers.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    assert_eq!(
        resp.headers()
            .get("Content-Type")
            .unwrap()
            .to_str()
            .unwrap(),
        "text/html"
    );
    let body = resp.text().await.unwrap();
    assert_eq!(body, "Content-Type set to text/html");

    // iterate
    let resp = reqwest::Client::new()
        .get(format!("{}/iterate", URL_ADDRESS))
        .header(X_LAND_M, format!("{}/3-headers.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.text().await.unwrap();
    assert_eq!(
        body,
        "Headers iterated:\ncontent-type: text/plain\nx-custom-header: CustomValue\n"
    );
}

#[tokio::test]
async fn js_4_request() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/4-request.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(
        body,
        "{\"method\":\"POST\",\"headers\":{\"x-test-header\":\"TestValue\"}}"
    );
}

#[tokio::test]
async fn js_5_response() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/5-response.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed");
}

#[tokio::test]
async fn js_6_text_encoder() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/6-text-encoder.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}

#[tokio::test]
async fn js_7_text_decoder() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/7-text-decoder.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}

#[tokio::test]
async fn js_8_url() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/8-url.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}

#[tokio::test]
async fn js_8_1_url_searchparams() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/8-1-url-search-params.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}

#[tokio::test]
async fn js_9_wait_until() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/9-wait-until.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "Hello World!");
}

#[tokio::test]
async fn js_10_atob_btoa() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, format!("{}/10-atob-btoa.js.wasm", JS_DIR))
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}
