#[cfg(test)]
use reqwest::StatusCode;

#[cfg(test)]
static URL_ADDRESS: &str = "http://127.0.0.1:9830";
#[cfg(test)]
static X_LAND_M: &str = "x-land-m";

#[tokio::test]
async fn js_1_hello() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, "tests/js-files/1-hello.js.wasm")
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
        .header(X_LAND_M, "tests/js-files/2-blob.js.wasm")
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
        .header(X_LAND_M, "tests/js-files/2-1-file.js.wasm")
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}

#[tokio::test]
async fn js_10_atob_btoa() {
    let req = reqwest::Client::new()
        .get(URL_ADDRESS)
        .header(X_LAND_M, "tests/js-files/10-atob-btoa.js.wasm")
        .send()
        .await
        .unwrap();
    assert_eq!(req.status(), StatusCode::OK);
    let body = req.text().await.unwrap();
    assert_eq!(body, "All tests passed!");
}
