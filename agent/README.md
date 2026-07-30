# VLearn Slide RAG Agent

Service AI độc lập của VLearn, tương ứng với **Member 2** trong `CLAUDE.md`. Service chịu trách nhiệm xây dựng chỉ mục và truy xuất kiến thức từ nội dung slide bằng RAG và Knowledge Graph.

Service chạy mặc định trên **port 8300** và được thiết kế để Backend trên port `8200` gọi qua REST nội bộ. Frontend không nên gọi trực tiếp service này.

## Phạm vi hiện tại

Service nhận dữ liệu slide đã được trích xuất thành JSON.

Việc đọc hoặc trích xuất nội dung trực tiếp từ PDF, PowerPoint, DOCX hay các định dạng tài liệu khác nằm ngoài phạm vi của service. Mỗi slide được lưu thành đúng một vector chunk và giữ lại metadata nguồn để phục vụ citation.

Các API hiện tại gồm:

* `GET /health`
* `POST /build-graph`
* `POST /retrieve`
* `POST /chat`

## Stack

* FastAPI
* OpenAI Embeddings và Responses API cho chế độ live
* Qdrant cho vector store
* Neo4j cho Knowledge Graph
* In-memory stores và mock providers cho local development và unit test

## Local mock mode

Mock providers và in-memory stores được sử dụng mặc định.

Chế độ này:

* Không cần Docker.
* Không cần credentials.
* Không thực hiện network call.
* Cho kết quả deterministic.
* Không yêu cầu API key khi chạy unit test.

Từ thư mục root của repository:

```powershell
python -m unittest discover -s agent/tests -v
uvicorn agent.app.main:app --reload --port 8300
```

Gửi nội dung file:

```text
agent/data/sample_slides.json
```

đến:

```text
POST /build-graph
```

Sau khi xây dựng index, có thể sử dụng:

```text
POST /retrieve
POST /chat
```

Kiểm tra trạng thái service bằng:

```text
GET /health
```

Uvicorn chịu trách nhiệm cấu hình host và port. Application không tự bind host hoặc port.

## Local Compose infrastructure

File Compose đi kèm chỉ dành cho:

* Local development.
* Live-integration testing.
* Kiểm thử kết nối thật với Qdrant và Neo4j.

Đây không phải cấu hình production.

Các database port trong Compose chỉ được bind vào `127.0.0.1`.

Từ thư mục `agent`, sao chép file môi trường:

```powershell
copy .env.example .env
```

Đặt một mật khẩu Neo4j local không phải mật khẩu mặc định và sử dụng cùng mật khẩu cho cả hai biến:

```text
NEO4J_PASSWORD=<local-password>
NEO4J_AUTH=neo4j/<local-password>
```

Sau đó khởi động Qdrant và Neo4j:

```powershell
docker compose -f docker-compose.yml up -d
```

File `.env` phải được Git ignore và không được commit credentials vào repository.

## Live-provider mode

Để chạy service với OpenAI, Qdrant và Neo4j thật trong môi trường local, cấu hình:

```text
RAG_PROVIDER=openai
RAG_VECTOR_STORE=qdrant
RAG_GRAPH_STORE=neo4j
```

Thêm OpenAI API key vào file `.env` local:

```text
OPENAI_API_KEY=<your-api-key>
```

Các biến môi trường phải được load vào process trước khi khởi động Uvicorn.

OpenAI embeddings và Responses API chỉ được gọi khi:

```text
RAG_PROVIDER=openai
```

và `OPENAI_API_KEY` hợp lệ đã được cấu hình.

Khi sử dụng live-provider mode, dữ liệu vector được lưu trong Qdrant và dữ liệu Knowledge Graph được lưu trong Neo4j.

## API overview

### `GET /health`

Kiểm tra trạng thái hoạt động của service.

### `POST /build-graph`

Nhận slide JSON đã được trích xuất trước và xây dựng dữ liệu phục vụ retrieval.

Mỗi slide:

* Trở thành một vector chunk.
* Giữ metadata nguồn.
* Có thể được dùng để tạo citation trong kết quả truy xuất và câu trả lời.

Có thể sử dụng file mẫu:

```text
agent/data/sample_slides.json
```

để kiểm thử endpoint này.

### `POST /retrieve`

Truy xuất các slide chunk và thông tin Knowledge Graph liên quan đến câu hỏi.

Endpoint này chỉ thực hiện retrieval và phù hợp để Backend kiểm tra context trước khi gọi luồng sinh câu trả lời.

### `POST /chat`

Nhận câu hỏi, truy xuất context liên quan và tạo câu trả lời dựa trên dữ liệu đã được index.

Kết quả trả về cần giữ thông tin nguồn để Backend có thể hiển thị citation phù hợp.

## Internal service architecture

Theo kiến trúc VLearn:

```text
Frontend → Backend :8200 → Agent :8300
```

Agent được thiết kế như một internal service.

Không expose trực tiếp port `8300` ra Internet công khai. Việc authentication, authorization, rate limiting và kiểm soát người dùng nên được xử lý tại Backend hoặc API gateway.

## Tests

Chạy toàn bộ unit test từ repository root:

```powershell
python -m unittest discover -s agent/tests -v
```

Các unit test sử dụng mock providers và in-memory stores nên không cần:

* Docker.
* OpenAI API key.
* Qdrant server.
* Neo4j server.
* Network access.

Live-integration test chỉ nên chạy sau khi:

1. Qdrant và Neo4j đã được khởi động bằng Docker Compose.
2. Các biến môi trường live-provider đã được cấu hình.
3. `OPENAI_API_KEY` hợp lệ đã được load vào process.

## Real deployment

Không sử dụng trực tiếp file Docker Compose dành cho local development để triển khai production.

Trong môi trường thật, Qdrant và Neo4j phải được triển khai dưới dạng authenticated services với:

* TLS cho các kết nối.
* Encrypted service endpoints.
* Managed secrets.
* Deployment-specific credentials.
* Network access restrictions.
* Firewall hoặc private network.
* Backup và restore policy.
* Monitoring và health checks.
* Credential rotation.

Không publish các local development database container ra một mạng không đáng tin cậy.

Production retrieval phải sử dụng Qdrant bền vững thay vì in-memory vector store. Neo4j production cũng phải sử dụng persistent storage, authentication và backup phù hợp.
