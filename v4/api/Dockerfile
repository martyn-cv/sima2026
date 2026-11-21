# API de SIMA (C# / .NET 8). Contexto de construcción: v3/api
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Sima.Api/Sima.Api.csproj Sima.Api/
RUN dotnet restore Sima.Api/Sima.Api.csproj
COPY Sima.Api Sima.Api
RUN dotnet publish Sima.Api/Sima.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:5080
EXPOSE 5080
ENTRYPOINT ["dotnet", "Sima.Api.dll"]
